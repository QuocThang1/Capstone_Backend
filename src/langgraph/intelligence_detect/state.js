const createInitialIntelligenceDetectState = (query = "", context = {}) => ({
    query: query || "",
    intent: "unknown",
    entities: {
        projectId: context.projectId,
        boardId: context.boardId,
        sprintId: context.sprintId,
        taskId: context.taskId || context.issueId,
        issueId: context.issueId || context.taskId,
        workflowId: context.workflowId,
        userId: context.userId || context.assigneeId,
        assigneeId: context.assigneeId || context.userId,
        timeRange: context.timeRange,
        reportType: context.reportType,
    },
    rawData: {
        project: null,
        board: null,
        sprint: null,
        tasks: [],
        workflowStatuses: [],
        history: [],
        thresholds: null,
    },
    normalizedData: null,
    ruleResults: [],
    llmAnalysis: null,
    recommendations: [],
    report: null,
    finalResponse: null,
    errors: [],
    metadata: {
        startedAt: new Date().toISOString(),
        logs: [],
        llmUsed: false,
        llmFallback: false,
    },
});

const addLog = (state, message, details = {}) => {
    state.metadata.logs.push({
        at: new Date().toISOString(),
        message,
        details,
    });
};

module.exports = {
    createInitialIntelligenceDetectState,
    addLog,
};
