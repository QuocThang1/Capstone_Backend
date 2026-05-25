const projectDAO = require("../../DAO/projectDAO");
const issueDAO = require("../../DAO/issueDAO");
const sprintDAO = require("../../DAO/sprintDAO");
const workflowDAO = require("../../DAO/workflowDAO");
const historyDAO = require("../../DAO/historyDAO");
const { DEFAULT_THRESHOLDS } = require("./constants");
const { addLog } = require("./state");

const ensureProjectAccess = async (projectId, authUserId) => {
    if (!authUserId) return true;
    return projectDAO.isMemberOfProject(projectId, authUserId);
};

const dataFetchNode = async (state) => {
    const { projectId, sprintId, issueId, taskId, workflowId } = state.entities;
    const authUserId = state.metadata.authUserId;
    let resolvedProjectId = projectId;

    if (issueId || taskId) {
        const issue = await issueDAO.getIssueById(issueId || taskId);
        if (issue) {
            resolvedProjectId = issue.projectId;
            state.rawData.tasks = [issue];
        }
    }

    if (sprintId) {
        state.rawData.sprint = await sprintDAO.getSprintById(sprintId);
        if (state.rawData.sprint) resolvedProjectId = state.rawData.sprint.projectId;
    }

    if (!resolvedProjectId) {
        state.errors.push("missing_projectId");
        addLog(state, "data_fetch_skipped", { reason: "missing_projectId" });
        return state;
    }

    const hasAccess = await ensureProjectAccess(resolvedProjectId, authUserId);
    if (!hasAccess) {
        state.errors.push("forbidden_project_access");
        addLog(state, "data_fetch_failed", { reason: "forbidden_project_access" });
        return state;
    }

    state.entities.projectId = resolvedProjectId.toString();
    state.rawData.project = await projectDAO.getProjectById(resolvedProjectId);

    if (!state.rawData.sprint && sprintId) {
        state.rawData.sprint = await sprintDAO.getSprintById(sprintId);
    }

    if (!state.rawData.tasks.length) {
        const filter = { projectId: resolvedProjectId };
        if (sprintId) filter.sprintId = sprintId;
        state.rawData.tasks = await issueDAO.getIssues(filter);
    }

    const activeWorkflow = workflowId
        ? await workflowDAO.getWorkflowById(workflowId)
        : state.rawData.project?.activeWorkflowId;

    state.rawData.workflowStatuses = state.rawData.project?.boardColumns || [];
    state.rawData.workflow = activeWorkflow || null;
    state.rawData.board = {
        projectId: resolvedProjectId,
        columns: state.rawData.project?.boardColumns || [],
    };
    state.rawData.thresholds = {
        ...DEFAULT_THRESHOLDS,
        ...(state.rawData.project?.bottleneckThresholds || {}),
    };

    const issueIds = state.rawData.tasks.map((task) => task._id);
    state.rawData.history = issueIds.length
        ? await historyDAO.getHistoriesByIssueIds(issueIds)
        : [];

    addLog(state, "data_fetched", {
        taskCount: state.rawData.tasks.length,
        historyCount: state.rawData.history.length,
        statusCount: state.rawData.workflowStatuses.length,
    });

    return state;
};

module.exports = {
    dataFetchNode,
};
