const { buildChartsData } = require("./reportGenerator");
const { addLog } = require("./state");

const requiredEntityMessage = (state) => {
    if (state.errors.includes("forbidden_project_access")) {
        return "You do not have access to this project.";
    }
    if (state.errors.includes("missing_scope_entity") || state.errors.includes("missing_projectId")) {
        return "Please provide projectId, sprintId, or issueId so Intelligence Detect can analyze the correct scope.";
    }
    return null;
};

const responseFormatterNode = async (state) => {
    const missingEntityMessage = requiredEntityMessage(state);

    state.finalResponse = {
        intent: state.intent,
        summary: missingEntityMessage || state.llmAnalysis?.summary || state.report?.overview || "Bottleneck analysis completed.",
        bottlenecks: state.ruleResults,
        recommendations: state.recommendations,
        report: state.report,
        chartsData: state.report?.chartsData || buildChartsData(state.normalizedData, state.ruleResults),
        metadata: {
            entities: state.entities,
            totals: state.normalizedData?.totals,
            llmUsed: state.metadata.llmUsed,
            llmFallback: state.metadata.llmFallback,
            errors: state.errors,
            completedAt: new Date().toISOString(),
        },
        llmAnalysis: state.llmAnalysis,
    };

    addLog(state, "response_formatted", { hasErrors: state.errors.length > 0 });
    return state;
};

module.exports = {
    responseFormatterNode,
};
