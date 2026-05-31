const { DONE_STATUSES } = require("./constants");
const { addLog } = require("./state");

const toId = (value) => {
    if (!value) return null;
    if (value._id) return value._id.toString();
    return value.toString();
};

const toDate = (value) => (value ? new Date(value) : null);

const diffDays = (from, to = new Date()) => {
    if (!from) return null;
    return Math.max(0, (to - new Date(from)) / (1000 * 60 * 60 * 24));
};

const isDoneStatus = (status = "", resolution = "") => {
    const normalizedStatus = status.toLowerCase();
    const normalizedResolution = resolution.toLowerCase();
    return DONE_STATUSES.includes(normalizedStatus) || DONE_STATUSES.includes(normalizedResolution);
};

const getLatestStatusHistory = (issueId, histories = []) => {
    return histories.find((history) =>
        toId(history.issueId) === toId(issueId) &&
        String(history.field || "").toLowerCase() === "status"
    );
};

const normalizeTask = (task, histories = [], now = new Date()) => {
    const statusHistory = getLatestStatusHistory(task._id, histories);
    // The Issue schema does not store statusChangedAt. Use latest Status history when available,
    // otherwise fallback to updatedAt so old tasks can still be analyzed safely.
    const statusChangedAt = statusHistory?.createdAt || task.updatedAt || task.createdAt;
    const statusChangedAtSource = statusHistory?.createdAt ? "history" : "updatedAt_fallback";
    const assignee = task.assigneeId && task.assigneeId._id ? task.assigneeId : null;
    const dueDate = toDate(task.dueDate);
    const done = isDoneStatus(task.status, task.resolution);

    return {
        id: toId(task._id),
        issueKey: task.issueKey,
        name: task.title,
        title: task.title,
        type: task.type,
        projectId: toId(task.projectId),
        sprintId: toId(task.sprintId),
        parentId: toId(task.parentId),
        currentStatus: task.status,
        status: task.status,
        resolution: task.resolution,
        assigneeId: toId(task.assigneeId),
        assigneeName: assignee?.fullName || assignee?.username || null,
        reporterId: toId(task.reporterId),
        priority: task.priority || "Medium",
        storyPoints: task.storyPoints || 0,
        timeExpect: task.timeExpect || 0,
        startDate: task.startDate,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        completedAt: task.completedAt,
        statusChangedAt,
        statusChangedAtSource,
        daysInCurrentStatus: diffDays(statusChangedAt, now),
        hoursInCurrentStatus: diffDays(statusChangedAt, now) * 24,
        daysSinceUpdated: diffDays(task.updatedAt || task.createdAt, now),
        isDone: done,
        isOverdue: !!dueDate && dueDate < now && !done,
        isStale: false,
    };
};

const groupBy = (items, keyGetter) => items.reduce((acc, item) => {
    const key = keyGetter(item) || "Unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
}, {});

const normalizeIntelligenceDetectData = (rawData, now = new Date()) => {
    const tasks = (rawData.tasks || []).map((task) => normalizeTask(task, rawData.history || [], now));
    const thresholds = rawData.thresholds || {};

    tasks.forEach((task) => {
        task.isStale = !task.isDone && task.daysSinceUpdated > thresholds.staleDays;
    });

    const tasksByStatus = groupBy(tasks, (task) => task.currentStatus);
    const activeTasks = tasks.filter((task) => !task.isDone);
    const workloadByUser = groupBy(activeTasks, (task) => task.assigneeId);
    const taskCountPerStatus = Object.fromEntries(
        Object.entries(tasksByStatus).map(([status, statusTasks]) => [status, statusTasks.length])
    );

    return {
        project: rawData.project ? {
            id: toId(rawData.project._id),
            name: rawData.project.name,
            key: rawData.project.key,
            boardColumns: rawData.project.boardColumns || [],
        } : null,
        sprint: rawData.sprint ? {
            id: toId(rawData.sprint._id),
            name: rawData.sprint.name,
            status: rawData.sprint.status,
            startDate: rawData.sprint.startDate,
            endDate: rawData.sprint.endDate,
            goal: rawData.sprint.goal,
        } : null,
        workflow: rawData.workflow ? {
            id: toId(rawData.workflow._id),
            name: rawData.workflow.name,
            transitions: rawData.workflow.transitions || [],
        } : null,
        tasks,
        activeTasks,
        workflowStatuses: rawData.workflowStatuses || [],
        thresholds,
        taskCountPerStatus,
        workloadPerUser: Object.fromEntries(
            Object.entries(workloadByUser).map(([userId, userTasks]) => [userId, {
                userId: userId === "Unassigned" ? null : userId,
                assigneeName: userTasks[0]?.assigneeName || "Unassigned",
                activeTaskCount: userTasks.length,
                tasks: userTasks.map((task) => ({ id: task.id, issueKey: task.issueKey, title: task.title, priority: task.priority })),
            }])
        ),
        totals: {
            tasks: tasks.length,
            activeTasks: activeTasks.length,
            doneTasks: tasks.length - activeTasks.length,
            overdueTasks: tasks.filter((task) => task.isOverdue).length,
            staleTasks: tasks.filter((task) => task.isStale).length,
        },
    };
};

const dataNormalizeNode = async (state) => {
    state.normalizedData = normalizeIntelligenceDetectData(state.rawData);
    addLog(state, "data_normalized", state.normalizedData.totals);
    return state;
};

module.exports = {
    normalizeTask,
    normalizeIntelligenceDetectData,
    dataNormalizeNode,
    diffDays,
    isDoneStatus,
};
