const { runIntelligenceDetectGraph } = require("../langgraph/intelligence_detect/graph");

const analyze = async (query, context = {}, authUserId) => {
    const state = await runIntelligenceDetectGraph({ query, context, authUserId });
    return state.finalResponse;
};

const detectBottlenecks = async (scope = {}, options = {}, authUserId) => {
    const query = options.query || "Detect bottlenecks for this scope.";
    return analyze(query, {
        ...scope,
        ...options,
        intent: "detect_bottleneck",
    }, authUserId);
};

const generateReport = async (scope = {}, options = {}, authUserId) => {
    const query = options.query || "Generate bottleneck report for this scope.";
    return analyze(query, {
        ...scope,
        ...options,
        intent: "generate_report",
        reportType: options.reportType || "detailed",
    }, authUserId);
};

module.exports = {
    analyze,
    detectBottlenecks,
    generateReport,
};
