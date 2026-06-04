const Groq = require("groq-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const issueDAO = require("../DAO/issueDAO");
const projectDAO = require("../DAO/projectDAO");
const accountDAO = require("../DAO/accountDAO");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");
const { env } = require("../config/env");

const genAI = new GoogleGenerativeAI(env.ai.geminiApiKey);
const groq = new Groq({ apiKey: env.ai.groqApiKey });

const suggestAssigneesForIssue = async (issueId, userId) => {
    const issue = await issueDAO.getIssueById(issueId);
    if (!issue) throw new ApiError(StatusCodes.NOT_FOUND, "Issue not found.");

    const project = await projectDAO.getProjectById(issue.projectId);
    const isMember = project.members.some((m) => m.accountId._id.toString() === userId.toString());
    if (!isMember) throw new ApiError(StatusCodes.FORBIDDEN, "Access denied.");

    // Lấy danh sách account của tất cả staff trong project
    const memberIds = project.members.map((m) => m.accountId._id || m.accountId);
    const accounts = await accountDAO.getAccountsByIds(memberIds);

    // Lấy thông tin khối lượng công việc hiện tại (Cực kỳ quan trọng để Load Balancing)
    const workloads = await issueDAO.getMemberWorkloads(issue.projectId);

    // Gắn workload vào account info
    const candidates = accounts.map((acc) => {
        const load = workloads.find((w) => w._id.toString() === acc._id.toString());
        return {
            accountId: acc._id,
            fullName: acc.fullName,
            skills: acc.skills || [],
            activeTasksCount: load ? load.activeTasksCount : 0,
            storyPointsLoad: load ? load.totalPoints : 0
        };
    });

    // Tối ưu để AI tập trung vào đánh giá Skill và Load Balancing
    const prompt = `You are an expert Agile Team Manager. I have an issue that needs to be assigned.
    Analyze the issue requirements and evaluate the team members to recommend the best candidates.
    
    ISSUE DETAILS:
    - Title: "${issue.title}"
    - Description: "${issue.description || "No description"}"
    - Required Skills: [${(issue.requiredSkills || []).join(", ")}]
    - Priority: ${issue.priority}
    - Story Points: ${issue.storyPoints} (Load weight of this task)
    
    CANDIDATES INFO:
    ${JSON.stringify(candidates, null, 2)}
    
    RULES:
    1. Highly prioritize members who have skills matching the "Required Skills".
    2. Secondary priority factor must be "Load Balancing". If two members have the same skills, pick the one with lower "activeTasksCount" and "storyPointsLoad".
    3. Suggest up to 3 best candidates ranked by suitability.
    
    You MUST respond with a raw valid JSON object. Do not include markdown blocks like \`\`\`json. The JSON must exactly match this schema:
    {
       "recommendations": [
          {
             "accountId": "string",
             "fullName": "string",
             "matchScore": number (0-100),
             "reason": "string (A precise explanation of why this person fits considering both skills and their current workload)"
          }
       ]
    }`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        const responseText = chatCompletion.choices[0]?.message?.content || "";

        // Parse JSON Result
        const aiAnalysis = JSON.parse(responseText);
        return aiAnalysis.recommendations || [];
    } catch (error) {
        console.error("Groq AI Error: ", error);
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to analyze suggestions via AI.");
    }
};

const generateProjectSuggestion = async (prompt) => {
    if (!prompt || prompt.trim().length < 10) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Please provide a more detailed project description (at least 10 characters).");
    }

    const systemPrompt = `You are an expert Agile Project Manager and Software Architect. 
A user wants to create a new project management setup. Based on their description, generate a COMPLETE project configuration.

USER'S PROJECT DESCRIPTION:
"${prompt}"

You MUST respond with a raw valid JSON object matching this EXACT schema. Do not include markdown blocks.

RULES:
0. STRICT COMPLIANCE: If the USER'S PROJECT DESCRIPTION specifies exact details (e.g., specific project name, exact board columns, exact issue types, number of sprints, or specific tasks), you MUST prioritize and implement those exact requests, overriding any default rules below.
1. "project.name": A concise, professional project name (max 50 chars).
2. "project.key": 2-5 uppercase letters derived from the project name (e.g., "HRM", "SHOP", "CMS"). Must match /^[A-Z]{2,5}$/.
3. "project.description": A brief project description (1-2 sentences).
4. "project.boardColumns": Must START with "To Do" (order 1) and END with "Done" (highest order). Add 1-3 intermediate columns relevant to the project type (e.g., "In Progress", "Review", "Testing"). Each column needs "name" and "order".
5. "project.issueTypes": Always include "Task" and "Bug". Add 1-2 more relevant types (e.g., "Story", "Feature", "Improvement"). Each needs "name" and "description".
6. "workflow.name": "<ProjectName> Workflow".
7. "workflow.transitions": Define allowed status transitions. "from" and "to" values MUST exactly match boardColumn names. Every column must appear as "from" at least once. "Done" should be able to transition back to the first column.
8. "sprints": Create 2-4 sprints with meaningful names and goals. Each sprint has "name", "goal", and "durationDays" (e.g., 14 or 21). Do NOT include a "Backlog" sprint (it is auto-created).
9. "issues": Create 8-15 meaningful issues that cover the core work of the project.
   - "title": Clear, actionable title.
   - "description": 1-2 sentences explaining the work.
   - "type": MUST match one of the issueTypes names you defined.
   - "priority": One of ["Highest", "High", "Medium", "Low", "Lowest"].
   - "storyPoints": Integer 1-8 based on complexity.
   - "durationDays": Integer 1-7 based on how many days it should take.
   - "requiredSkills": Array of strings (e.g. ["React", "Node.js", "Design", "DevOps"]) specifying skills needed for the issue.
   - "sprintIndex": Index into the sprints array (0-based). Use null for Backlog.
   - "subtasks": Array of 0-3 subtasks. Each subtask has "title", "description", "priority", "storyPoints", "durationDays". Subtask type is always "Sub-task" (handled by system, don't include type field).
10. Respond must be in English
11. Make the issues realistic and cover different aspects of the project (setup, core features, testing, deployment).

JSON SCHEMA:
{
  "project": {
    "name": "string",
    "key": "string",
    "description": "string",
    "boardColumns": [{ "name": "string", "order": number }],
    "issueTypes": [{ "name": "string", "description": "string" }]
  },
  "workflow": {
    "name": "string",
    "transitions": [{ "from": "string", "to": ["string"] }]
  },
  "sprints": [{ "name": "string", "goal": "string", "durationDays": number }],
  "issues": [{
    "title": "string",
    "description": "string",
    "type": "string",
    "priority": "string",
    "storyPoints": number,
    "durationDays": number,
    "requiredSkills": ["string"],
    "sprintIndex": number | null,
    "subtasks": [{
      "title": "string",
      "description": "string",
      "priority": "string",
      "storyPoints": number,
      "durationDays": number
    }]
  }]
}`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: systemPrompt }],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        const responseText = chatCompletion.choices[0]?.message?.content || "";
        const suggestion = JSON.parse(responseText);

        // Validate cấu trúc cơ bản trả về từ AI
        if (!suggestion.project || !suggestion.workflow || !suggestion.sprints || !suggestion.issues) {
            throw new Error("AI response missing required fields");
        }
        if (!suggestion.project.name || !suggestion.project.key || !suggestion.project.boardColumns?.length) {
            throw new Error("AI response has invalid project structure");
        }

        return suggestion;
    } catch (error) {
        console.error("Groq AI Smart Project Error: ", error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to generate project suggestion via AI. Please try again.");
    }
};

module.exports = { suggestAssigneesForIssue, generateProjectSuggestion };
