const { RULE_TYPES } = require("./constants");
const { addLog } = require("./state");

const priorityFromSeverity = (severity) => (["CRITICAL", "HIGH"].includes(severity) ? "HIGH" : severity);

const recommendationFor = (result) => {
    const base = {
        targetEntity: {
            type: result.affectedEntityType,
            id: result.affectedEntityId,
        },
        priority: priorityFromSeverity(result.severity),
        reason: result.reason,
    };

    switch (result.type) {
        case RULE_TYPES.TASK_STUCK:
            return {
                ...base,
                action: "Review the stuck task, confirm the next owner, and split the task if the scope is too large.",
                expectedImpact: "Reduce aging time in the current status and unblock downstream work.",
            };
        case RULE_TYPES.STATUS_OVERLOAD:
            return {
                ...base,
                action: `Reduce WIP in ${result.affectedEntityId}; pause new intake and move the oldest/highest-priority tasks first.`,
                expectedImpact: "Lower queue size and improve flow through the overloaded status.",
            };
        case RULE_TYPES.TASK_OVERDUE:
            return {
                ...base,
                action: "Prioritize this overdue task, reassess its due date, and notify the assignee or project leader.",
                expectedImpact: "Reduce delivery risk and make ownership explicit.",
            };
        case RULE_TYPES.TASK_STALE:
            return {
                ...base,
                action: "Ask the assignee for an update or move the task back to backlog if it is no longer active.",
                expectedImpact: "Restore visibility and remove hidden work from the active flow.",
            };
        case RULE_TYPES.ASSIGNEE_OVERLOAD:
            return {
                ...base,
                action: "Rebalance active tasks across the team or add a reviewer/helper for the overloaded assignee.",
                expectedImpact: "Reduce personal WIP and lower the chance of delayed handoffs.",
            };
        case RULE_TYPES.SPRINT_RISK:
            return {
                ...base,
                action: "Run a sprint triage: protect must-finish items, move lower-priority work out, and update stakeholders.",
                expectedImpact: "Improve sprint completion predictability before the end date.",
            };
        case RULE_TYPES.HIGH_PRIORITY_BLOCKED:
            return {
                ...base,
                action: "Escalate this high-priority task, assign a clear next action, and remove review/test dependencies.",
                expectedImpact: "Protect high-value delivery work from aging unnoticed.",
            };
        default:
            return {
                ...base,
                action: "Review this bottleneck signal and assign a concrete owner.",
                expectedImpact: "Improve visibility and ownership.",
            };
    }
};

const recommendationNode = async (state) => {
    const seen = new Set();
    state.recommendations = state.ruleResults
        .map(recommendationFor)
        .filter((recommendation) => {
            const key = `${recommendation.action}:${recommendation.targetEntity.type}:${recommendation.targetEntity.id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 12);

    addLog(state, "recommendations_generated", { count: state.recommendations.length });
    return state;
};

module.exports = {
    recommendationNode,
    recommendationFor,
};
