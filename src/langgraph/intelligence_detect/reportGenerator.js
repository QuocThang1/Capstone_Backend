const { addLog } = require("./state");

const countSeverity = (ruleResults) => ruleResults.reduce((acc, result) => {
    acc[result.severity] = (acc[result.severity] || 0) + 1;
    return acc;
}, {});

const buildChartsData = (normalizedData, ruleResults) => ({
    taskCountPerStatus: normalizedData?.taskCountPerStatus || {},
    severityDistribution: countSeverity(ruleResults),
    workloadPerUser: Object.values(normalizedData?.workloadPerUser || {}).map((workload) => ({
        userId: workload.userId,
        name: workload.assigneeName,
        activeTaskCount: workload.activeTaskCount,
    })),
});

const generateReport = (state) => {
    const bottlenecks = state.ruleResults;
    const topBottlenecks = bottlenecks.slice(0, 8);

    return {
        type: state.entities.reportType || "short",
        overview: state.llmAnalysis?.summary || `${bottlenecks.length} bottleneck signal(s) detected.`,
        keyBottlenecks: topBottlenecks,
        evidence: {
            totals: state.normalizedData?.totals,
            taskCountPerStatus: state.normalizedData?.taskCountPerStatus,
            thresholds: state.normalizedData?.thresholds,
        },
        rootCauses: state.llmAnalysis?.rootCauseHypothesis || topBottlenecks.map((item) => item.reason),
        recommendedActions: state.recommendations,
        riskLevel: state.llmAnalysis?.risk || topBottlenecks[0]?.severity || "LOW",
        nextSteps: state.recommendations.slice(0, 5).map((recommendation) => recommendation.action),
        chartsData: buildChartsData(state.normalizedData, state.ruleResults),
    };
};

const reportGeneratorNode = async (state) => {
    state.report = generateReport(state);
    addLog(state, "report_generated", { type: state.report.type });
    return state;
};

module.exports = {
    reportGeneratorNode,
    generateReport,
    buildChartsData,
};
