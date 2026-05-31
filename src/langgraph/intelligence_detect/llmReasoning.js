const axios = require("axios");
const { addLog } = require("./state");

const compactForLlm = (state) => ({
    query: state.query,
    intent: state.intent,
    project: state.normalizedData?.project,
    sprint: state.normalizedData?.sprint,
    totals: state.normalizedData?.totals,
    taskCountPerStatus: state.normalizedData?.taskCountPerStatus,
    workloadPerUser: state.normalizedData?.workloadPerUser,
    bottlenecks: state.ruleResults.slice(0, 20),
});

const ruleBasedAnalysis = (state, fallbackReason = null) => {
    const count = state.ruleResults.length;
    const top = state.ruleResults[0];

    return {
        summary: count
            ? `Detected ${count} bottleneck signal(s). Highest severity: ${top.severity} (${top.type}).`
            : "No bottleneck signals were detected by the current rules.",
        rootCauseHypothesis: count
            ? state.ruleResults.slice(0, 3).map((result) => result.reason)
            : [],
        detailedExplanation: count
            ? "This explanation is generated from rule-based evidence because LLM reasoning is unavailable or not configured."
            : "The project data did not exceed the configured bottleneck thresholds.",
        risk: top?.severity || "LOW",
        confidence: count ? 0.78 : 0.7,
        insufficient_data: state.errors.length ? state.errors : [],
        fallbackReason,
    };
};

const parseJsonFromText = (text) => {
    try {
        return JSON.parse(text);
    } catch (error) {
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw error;
        return JSON.parse(match[0]);
    }
};

const callOpenAiCompatible = async (payload) => {
    const apiKey = process.env.INTELLIGENCE_DETECT_LLM_API_KEY || process.env.OPENAI_API_KEY;
    const baseUrl = process.env.INTELLIGENCE_DETECT_LLM_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.INTELLIGENCE_DETECT_LLM_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";

    if (!apiKey) return null;

    const response = await axios.post(
        `${baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
            model,
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: [
                        "You are Intelligence Detect, a workflow bottleneck analysis assistant.",
                        "Use only the provided JSON evidence. Do not invent IDs, names, counts, or dates.",
                        "If evidence is missing, write insufficient_data in the output.",
                        "Return valid JSON with summary, rootCauseHypothesis, detailedExplanation, risk, confidence, insufficient_data.",
                    ].join(" "),
                },
                { role: "user", content: JSON.stringify(payload) },
            ],
        },
        { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    return content ? parseJsonFromText(content) : null;
};

const llmReasoningNode = async (state) => {
    try {
        const llmOutput = await callOpenAiCompatible(compactForLlm(state));
        if (!llmOutput) {
            state.metadata.llmFallback = true;
            state.llmAnalysis = ruleBasedAnalysis(state, "llm_not_configured");
            addLog(state, "llm_fallback", { reason: "llm_not_configured" });
            return state;
        }

        state.metadata.llmUsed = true;
        state.llmAnalysis = {
            summary: llmOutput.summary || ruleBasedAnalysis(state).summary,
            rootCauseHypothesis: llmOutput.rootCauseHypothesis || [],
            detailedExplanation: llmOutput.detailedExplanation || "",
            risk: llmOutput.risk || state.ruleResults[0]?.severity || "LOW",
            confidence: Number(llmOutput.confidence || 0.75),
            insufficient_data: llmOutput.insufficient_data || [],
        };
        addLog(state, "llm_reasoning_completed", { model: process.env.INTELLIGENCE_DETECT_LLM_MODEL || process.env.OPENAI_MODEL });
    } catch (error) {
        state.metadata.llmFallback = true;
        state.llmAnalysis = ruleBasedAnalysis(state, error.message);
        addLog(state, "llm_fallback", { reason: error.message });
    }

    return state;
};

module.exports = {
    llmReasoningNode,
    ruleBasedAnalysis,
};
