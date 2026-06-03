const { INTENTS } = require("./constants");
const { addLog } = require("./state");

const includesAny = (text, terms) => terms.some((term) => text.includes(term));

const classifyIntent = (query = "", context = {}) => {
    const normalized = query.toLowerCase();

    if (context.intent && Object.values(INTENTS).includes(context.intent)) {
        return context.intent;
    }

    if (includesAny(normalized, ["report", "báo cáo", "historical", "chi tiết"])) {
        return INTENTS.GENERATE_REPORT;
    }
    if (includesAny(normalized, ["dashboard", "insight", "tổng quan", "summary"])) {
        return INTENTS.DASHBOARD_INSIGHT;
    }
    if (includesAny(normalized, ["vì sao", "why", "explain", "nguyên nhân", "chậm"])) {
        return INTENTS.EXPLAIN_BOTTLENECK;
    }
    if (includesAny(normalized, ["đề xuất", "recommend", "solution", "xử lý", "fix"])) {
        return INTENTS.RECOMMEND_SOLUTION;
    }
    if (includesAny(normalized, ["overload", "quá tải", "ai đang", "assignee", "team"])) {
        return INTENTS.WORKLOAD_ANALYSIS;
    }
    if (includesAny(normalized, ["sprint"])) {
        return INTENTS.SPRINT_HEALTH_ANALYSIS;
    }
    if (includesAny(normalized, ["status", "trạng thái", "nghẽn"])) {
        return INTENTS.WORKFLOW_STATUS_ANALYSIS;
    }
    if (includesAny(normalized, ["stale", "không cập nhật", "lâu ngày"])) {
        return INTENTS.TASK_STALE_ANALYSIS;
    }
    if (includesAny(normalized, ["bottleneck", "kẹt", "blocked", "detect", "phát hiện", "task nào"])) {
        return INTENTS.DETECT_BOTTLENECK;
    }

    return INTENTS.DETECT_BOTTLENECK;
};

const inputClassifierNode = async (state) => {
    state.intent = classifyIntent(state.query, {
        ...state.entities,
        intent: state.entities.intent,
    });

    state.entities = {
        ...state.entities,
        projectId: state.entities.projectId,
        boardId: state.entities.boardId,
        sprintId: state.entities.sprintId,
        taskId: state.entities.taskId,
        issueId: state.entities.issueId,
        workflowId: state.entities.workflowId,
        userId: state.entities.userId,
        assigneeId: state.entities.assigneeId,
        timeRange: state.entities.timeRange,
        reportType: state.entities.reportType || (state.intent === INTENTS.GENERATE_REPORT ? "detailed" : "short"),
    };

    if (!state.entities.projectId && !state.entities.sprintId && !state.entities.taskId && !state.entities.issueId) {
        state.errors.push("missing_scope_entity");
    }

    addLog(state, "intent_detected", { intent: state.intent, entities: state.entities });
    return state;
};

module.exports = {
    classifyIntent,
    inputClassifierNode,
};
