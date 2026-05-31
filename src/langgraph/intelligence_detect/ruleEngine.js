const { RULE_TYPES, SEVERITY } = require("./constants");
const { addLog } = require("./state");

const severityRank = [SEVERITY.LOW, SEVERITY.MEDIUM, SEVERITY.HIGH, SEVERITY.CRITICAL];

const calculateSeverity = (ruleType, metricValue, thresholdValue, context = {}) => {
    if (thresholdValue === 0 || thresholdValue == null) return SEVERITY.LOW;
    const ratio = metricValue / thresholdValue;
    const priority = String(context.priority || "").toLowerCase();

    if (ruleType === RULE_TYPES.TASK_OVERDUE) {
        if (metricValue >= 7 || priority === "highest") return SEVERITY.CRITICAL;
        if (metricValue >= 3 || priority === "high") return SEVERITY.HIGH;
        return SEVERITY.MEDIUM;
    }

    if (ruleType === RULE_TYPES.SPRINT_RISK) {
        if (context.daysLeft <= 1 && context.remainingRatio >= 0.5) return SEVERITY.CRITICAL;
        if (context.daysLeft <= 2 || context.remainingRatio >= 0.5) return SEVERITY.HIGH;
        return SEVERITY.MEDIUM;
    }

    if (ruleType === RULE_TYPES.HIGH_PRIORITY_BLOCKED) {
        if (ratio >= 2 || context.isOverdue) return SEVERITY.CRITICAL;
        return SEVERITY.HIGH;
    }

    if (ratio >= 3) return SEVERITY.CRITICAL;
    if (ratio >= 2) return SEVERITY.HIGH;
    if (ratio >= 1.25) return SEVERITY.MEDIUM;
    return SEVERITY.LOW;
};

const createResult = ({ type, severity, affectedEntityType, affectedEntityId, reason, evidence, metricValue, thresholdValue }) => ({
    bottleneckType: type,
    type,
    severity,
    affectedEntityType,
    affectedEntityId,
    reason,
    evidence,
    metricValue,
    thresholdValue,
});

const TaskStuckRule = ({ tasks, thresholds }) => tasks
    .filter((task) => !task.isDone && task.daysInCurrentStatus > thresholds.daysInStatus)
    .map((task) => createResult({
        type: RULE_TYPES.TASK_STUCK,
        severity: calculateSeverity(RULE_TYPES.TASK_STUCK, task.daysInCurrentStatus, thresholds.daysInStatus, task),
        affectedEntityType: "TASK",
        affectedEntityId: task.id,
        reason: `${task.issueKey || task.id} has stayed in ${task.currentStatus} for ${task.daysInCurrentStatus.toFixed(1)} days.`,
        evidence: {
            issueKey: task.issueKey,
            title: task.title,
            status: task.currentStatus,
            daysInCurrentStatus: Number(task.daysInCurrentStatus.toFixed(1)),
            statusChangedAt: task.statusChangedAt,
            statusChangedAtSource: task.statusChangedAtSource,
            fallbackUsed: task.statusChangedAtSource !== "history",
        },
        metricValue: Number(task.daysInCurrentStatus.toFixed(1)),
        thresholdValue: thresholds.daysInStatus,
    }));

const StatusOverloadRule = ({ taskCountPerStatus, tasks, thresholds }) => Object.entries(taskCountPerStatus)
    .filter(([status]) => !["Done", "Completed", "Closed"].includes(status))
    .filter(([, count]) => count > thresholds.maxTasksPerStatus)
    .map(([status, count]) => createResult({
        type: RULE_TYPES.STATUS_OVERLOAD,
        severity: calculateSeverity(RULE_TYPES.STATUS_OVERLOAD, count, thresholds.maxTasksPerStatus),
        affectedEntityType: "STATUS",
        affectedEntityId: status,
        reason: `${status} contains ${count} tasks, above the WIP threshold ${thresholds.maxTasksPerStatus}.`,
        evidence: {
            status,
            taskCount: count,
            threshold: thresholds.maxTasksPerStatus,
            taskKeys: tasks.filter((task) => task.currentStatus === status).map((task) => task.issueKey || task.id),
        },
        metricValue: count,
        thresholdValue: thresholds.maxTasksPerStatus,
    }));

const OverdueTaskRule = ({ tasks }) => tasks
    .filter((task) => task.isOverdue)
    .map((task) => {
        const overdueDays = Math.max(0, (new Date() - new Date(task.dueDate)) / (1000 * 60 * 60 * 24));
        return createResult({
            type: RULE_TYPES.TASK_OVERDUE,
            severity: calculateSeverity(RULE_TYPES.TASK_OVERDUE, overdueDays, 1, task),
            affectedEntityType: "TASK",
            affectedEntityId: task.id,
            reason: `${task.issueKey || task.id} is overdue and still in ${task.currentStatus}.`,
            evidence: {
                issueKey: task.issueKey,
                title: task.title,
                dueDate: task.dueDate,
                status: task.currentStatus,
                overdueDays: Number(overdueDays.toFixed(1)),
            },
            metricValue: Number(overdueDays.toFixed(1)),
            thresholdValue: 0,
        });
    });

const StaleTaskRule = ({ tasks, thresholds }) => tasks
    .filter((task) => !task.isDone && task.daysSinceUpdated > thresholds.staleDays)
    .map((task) => createResult({
        type: RULE_TYPES.TASK_STALE,
        severity: calculateSeverity(RULE_TYPES.TASK_STALE, task.daysSinceUpdated, thresholds.staleDays, task),
        affectedEntityType: "TASK",
        affectedEntityId: task.id,
        reason: `${task.issueKey || task.id} has not been updated for ${task.daysSinceUpdated.toFixed(1)} days.`,
        evidence: {
            issueKey: task.issueKey,
            title: task.title,
            updatedAt: task.updatedAt,
            daysSinceUpdated: Number(task.daysSinceUpdated.toFixed(1)),
        },
        metricValue: Number(task.daysSinceUpdated.toFixed(1)),
        thresholdValue: thresholds.staleDays,
    }));

const AssigneeOverloadRule = ({ workloadPerUser, thresholds }) => Object.values(workloadPerUser)
    .filter((workload) => workload.userId && workload.activeTaskCount > thresholds.maxActiveTasksPerUser)
    .map((workload) => createResult({
        type: RULE_TYPES.ASSIGNEE_OVERLOAD,
        severity: calculateSeverity(RULE_TYPES.ASSIGNEE_OVERLOAD, workload.activeTaskCount, thresholds.maxActiveTasksPerUser),
        affectedEntityType: "USER",
        affectedEntityId: workload.userId,
        reason: `${workload.assigneeName} has ${workload.activeTaskCount} active tasks.`,
        evidence: {
            assigneeName: workload.assigneeName,
            activeTaskCount: workload.activeTaskCount,
            threshold: thresholds.maxActiveTasksPerUser,
            tasks: workload.tasks,
        },
        metricValue: workload.activeTaskCount,
        thresholdValue: thresholds.maxActiveTasksPerUser,
    }));

const SprintRiskRule = ({ sprint, tasks, activeTasks, thresholds }) => {
    if (!sprint?.endDate || !tasks.length) return [];
    const now = new Date();
    const endDate = new Date(sprint.endDate);
    const daysLeft = (endDate - now) / (1000 * 60 * 60 * 24);
    const remainingRatio = activeTasks.length / tasks.length;

    if (daysLeft >= 0 && daysLeft <= thresholds.sprintRiskDaysLeft && remainingRatio > thresholds.sprintRemainingRatio) {
        return [createResult({
            type: RULE_TYPES.SPRINT_RISK,
            severity: calculateSeverity(RULE_TYPES.SPRINT_RISK, remainingRatio, thresholds.sprintRemainingRatio, { daysLeft, remainingRatio }),
            affectedEntityType: "SPRINT",
            affectedEntityId: sprint.id,
            reason: `${sprint.name} is near its end date with ${(remainingRatio * 100).toFixed(0)}% tasks still active.`,
            evidence: {
                sprintName: sprint.name,
                endDate: sprint.endDate,
                daysLeft: Number(daysLeft.toFixed(1)),
                totalTasks: tasks.length,
                remainingTasks: activeTasks.length,
                remainingRatio: Number(remainingRatio.toFixed(2)),
                threshold: thresholds.sprintRemainingRatio,
            },
            metricValue: Number(remainingRatio.toFixed(2)),
            thresholdValue: thresholds.sprintRemainingRatio,
        })];
    }
    return [];
};

const HighPriorityBlockedRule = ({ tasks, thresholds }) => tasks
    .filter((task) => ["Highest", "High"].includes(task.priority))
    .filter((task) => !task.isDone && (task.daysInCurrentStatus > thresholds.highPriorityDaysInStatus || task.isOverdue))
    .map((task) => createResult({
        type: RULE_TYPES.HIGH_PRIORITY_BLOCKED,
        severity: calculateSeverity(RULE_TYPES.HIGH_PRIORITY_BLOCKED, task.daysInCurrentStatus, thresholds.highPriorityDaysInStatus, task),
        affectedEntityType: "TASK",
        affectedEntityId: task.id,
        reason: `${task.priority} priority task ${task.issueKey || task.id} is blocked or aging in ${task.currentStatus}.`,
        evidence: {
            issueKey: task.issueKey,
            title: task.title,
            priority: task.priority,
            status: task.currentStatus,
            daysInCurrentStatus: Number(task.daysInCurrentStatus.toFixed(1)),
            isOverdue: task.isOverdue,
        },
        metricValue: Number(task.daysInCurrentStatus.toFixed(1)),
        thresholdValue: thresholds.highPriorityDaysInStatus,
    }));

const runBottleneckRules = (normalizedData) => {
    const input = normalizedData;
    const results = [
        ...TaskStuckRule(input),
        ...StatusOverloadRule(input),
        ...OverdueTaskRule(input),
        ...StaleTaskRule(input),
        ...AssigneeOverloadRule(input),
        ...SprintRiskRule(input),
        ...HighPriorityBlockedRule(input),
    ];

    return results.sort((a, b) => severityRank.indexOf(b.severity) - severityRank.indexOf(a.severity));
};

const bottleneckRuleAnalysisNode = async (state) => {
    state.ruleResults = runBottleneckRules(state.normalizedData);
    addLog(state, "rules_analyzed", { triggered: state.ruleResults.length });
    return state;
};

module.exports = {
    calculateSeverity,
    TaskStuckRule,
    StatusOverloadRule,
    OverdueTaskRule,
    StaleTaskRule,
    AssigneeOverloadRule,
    SprintRiskRule,
    HighPriorityBlockedRule,
    runBottleneckRules,
    bottleneckRuleAnalysisNode,
};
