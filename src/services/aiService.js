const { GoogleGenerativeAI } = require("@google/generative-ai");
const issueDAO = require("../DAO/issueDAO");
const projectDAO = require("../DAO/projectDAO");
const accountDAO = require("../DAO/accountDAO");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const suggestAssigneesForIssue = async (issueId, userId) => {
    // 1. Thu thập dữ liệu
    const issue = await issueDAO.getIssueById(issueId);
    if (!issue) throw new ApiError(StatusCodes.NOT_FOUND, "Issue not found.");

    const project = await projectDAO.getProjectById(issue.projectId);
    const isMember = project.members.some(m => m.accountId._id.toString() === userId.toString());
    if (!isMember) throw new ApiError(StatusCodes.FORBIDDEN, "Access denied.");

    // Lấy danh sách account của tất cả staff trong project
    const memberIds = project.members.map(m => m.accountId._id || m.accountId);
    const accounts = await accountDAO.getAccountsByIds(memberIds);

    // Lấy thông tin khối lượng công việc hiện tại (Cực kỳ quan trọng để Load Balancing)
    const workloads = await issueDAO.getMemberWorkloads(issue.projectId);

    // Gắn workload vào account info
    const candidates = accounts.map(acc => {
        const load = workloads.find(w => w._id.toString() === acc._id.toString());
        return {
            accountId: acc._id,
            fullName: acc.fullName,
            skills: acc.skills || [],
            activeTasksCount: load ? load.activeTasksCount : 0,
            storyPointsLoad: load ? load.totalPoints : 0
        };
    });

    // 2. Viết Prompt Engineering (AI Prompt)
    // Tối ưu để AI tập trung vào đánh giá Skill và Load Balancing
    const prompt = `You are an expert Agile Team Manager. I have an issue that needs to be assigned.
    Analyze the issue requirements and evaluate the team members to recommend the best candidates.
    
    ISSUE DETAILS:
    - Title: "${issue.title}"
    - Description: "${issue.description || 'No description'}"
    - Required Skills: [${(issue.requiredSkills || []).join(', ')}]
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
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Parse JSON Result
        const aiAnalysis = JSON.parse(responseText);
        return aiAnalysis.recommendations;

    } catch (error) {
        console.error("Gemini AI Error: ", error);
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to analyze suggestions via AI.");
    }
};

module.exports = { suggestAssigneesForIssue };