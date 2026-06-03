const INTENTS = {
    DETECT_BOTTLENECK: "detect_bottleneck",
    EXPLAIN_BOTTLENECK: "explain_bottleneck",
    RECOMMEND_SOLUTION: "recommend_solution",
    GENERATE_REPORT: "generate_report",
    DASHBOARD_INSIGHT: "dashboard_insight",
    WORKLOAD_ANALYSIS: "workload_analysis",
    SPRINT_HEALTH_ANALYSIS: "sprint_health_analysis",
    WORKFLOW_STATUS_ANALYSIS: "workflow_status_analysis",
    TASK_STALE_ANALYSIS: "task_stale_analysis",
    UNKNOWN: "unknown",
};

const SEVERITY = {
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
};

const RULE_TYPES = {
    TASK_STUCK: "TASK_STUCK",
    STATUS_OVERLOAD: "STATUS_OVERLOAD",
    TASK_OVERDUE: "TASK_OVERDUE",
    TASK_STALE: "TASK_STALE",
    ASSIGNEE_OVERLOAD: "ASSIGNEE_OVERLOAD",
    SPRINT_RISK: "SPRINT_RISK",
    HIGH_PRIORITY_BLOCKED: "HIGH_PRIORITY_BLOCKED",
};

const DONE_STATUSES = ["done", "completed", "closed", "resolved"];

const DEFAULT_THRESHOLDS = {
    daysInStatus: 3,
    maxTasksPerStatus: 5,
    staleDays: 5,
    maxActiveTasksPerUser: 5,
    sprintRiskDaysLeft: 3,
    sprintRemainingRatio: 0.35,
    highPriorityDaysInStatus: 2,
};

module.exports = {
    INTENTS,
    SEVERITY,
    RULE_TYPES,
    DONE_STATUSES,
    DEFAULT_THRESHOLDS,
};
