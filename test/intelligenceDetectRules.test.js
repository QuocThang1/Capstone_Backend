const assert = require("assert");
const { normalizeIntelligenceDetectData } = require("../src/langgraph/intelligence_detect/normalizer");
const {
    calculateSeverity,
    TaskStuckRule,
    StatusOverloadRule,
    OverdueTaskRule,
    StaleTaskRule,
    AssigneeOverloadRule,
    SprintRiskRule,
} = require("../src/langgraph/intelligence_detect/ruleEngine");
const { getRouteForIntent } = require("../src/langgraph/intelligence_detect/graph");

const now = new Date("2026-05-23T00:00:00.000Z");
const thresholds = {
    daysInStatus: 3,
    maxTasksPerStatus: 1,
    staleDays: 4,
    maxActiveTasksPerUser: 1,
    sprintRiskDaysLeft: 3,
    sprintRemainingRatio: 0.35,
    highPriorityDaysInStatus: 2,
};

const rawData = {
    project: { _id: "p1", name: "TASKA", key: "TSK", boardColumns: [{ name: "In Progress", order: 1 }] },
    sprint: { _id: "s1", name: "Sprint 1", status: "active", endDate: "2026-05-24T00:00:00.000Z" },
    thresholds,
    history: [
        { issueId: "i1", field: "Status", createdAt: "2026-05-18T00:00:00.000Z" },
    ],
    tasks: [
        {
            _id: "i1",
            issueKey: "TSK-1",
            title: "Checkout bug",
            status: "In Progress",
            resolution: "Unresolved",
            priority: "High",
            assigneeId: { _id: "u1", fullName: "Bao" },
            dueDate: "2026-05-20T00:00:00.000Z",
            updatedAt: "2026-05-18T00:00:00.000Z",
            createdAt: "2026-05-17T00:00:00.000Z",
        },
        {
            _id: "i2",
            issueKey: "TSK-2",
            title: "Review API",
            status: "In Progress",
            resolution: "Unresolved",
            priority: "Medium",
            assigneeId: { _id: "u1", fullName: "Bao" },
            dueDate: "2026-05-30T00:00:00.000Z",
            updatedAt: "2026-05-15T00:00:00.000Z",
            createdAt: "2026-05-14T00:00:00.000Z",
        },
    ],
};

const normalized = normalizeIntelligenceDetectData(rawData, now);

assert.strictEqual(normalized.tasks[0].daysInCurrentStatus, 5);
assert.strictEqual(TaskStuckRule(normalized).length, 2);
assert.strictEqual(StatusOverloadRule(normalized).length, 1);
assert.strictEqual(OverdueTaskRule(normalized).length, 1);
assert.strictEqual(StaleTaskRule(normalized).length, 2);
assert.strictEqual(AssigneeOverloadRule(normalized).length, 1);
assert.strictEqual(SprintRiskRule(normalized).length, 1);
assert.strictEqual(calculateSeverity("TASK_STUCK", 6, 3), "HIGH");
assert.ok(getRouteForIntent("generate_report").some((node) => node.name === "reportGeneratorNode"));

console.log("Intelligence Detect rule tests passed");
