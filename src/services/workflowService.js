const workflowDAO = require("../DAO/workflowDAO");
const projectDAO = require("../DAO/projectDAO");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");

const createWorkflowService = async (projectId, workflowData, userId) => {
    const { name, transitions } = workflowData;

    const project = await projectDAO.getProjectById(projectId);
    if (!project) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project.");
    }
    const leader = project.members.find(m => m.accountId.equals(userId));
    if (!leader || leader.role !== "leader") {
        throw new ApiError(StatusCodes.FORBIDDEN, "Only project leader can create workflows.");
    }

    const existingWorkflow = await workflowDAO.findWorkflowByName(projectId, name);
    if (existingWorkflow) {
        throw new ApiError(StatusCodes.CONFLICT, `Workflow with name "${name}" already exists.`);
    }

    return await workflowDAO.createWorkflow({ projectId, name, transitions });
};

const getWorkflowsByProjectService = async (projectId, userId) => {
    const project = await projectDAO.getProjectById(projectId);
    if (!project || !project.members.some(m => m.accountId.equals(userId))) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project.");
    }
    return await workflowDAO.getWorkflowsByProjectId(projectId);
};

const getWorkflowByIdService = async (workflowId, userId) => {
    const workflow = await workflowDAO.getWorkflowById(workflowId);
    if (!workflow) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Workflow not found.");
    }
    // Check access via project
    await getWorkflowsByProjectService(workflow.projectId, userId);
    return workflow;
};

const updateWorkflowService = async (workflowId, updateData, userId) => {
    const workflow = await getWorkflowByIdService(workflowId, userId); // Re-uses access check

    const project = await projectDAO.getProjectById(workflow.projectId);
    const leader = project.members.find(m => m.accountId.equals(userId));
    if (!leader || leader.role !== "leader") {
        throw new ApiError(StatusCodes.FORBIDDEN, "Only project leader can update workflows.");
    }

    if (updateData.name && updateData.name !== workflow.name) {
        const existing = await workflowDAO.findWorkflowByName(workflow.projectId, updateData.name);
        if (existing) {
            throw new ApiError(StatusCodes.CONFLICT, `Workflow with name "${updateData.name}" already exists.`);
        }
    }

    return await workflowDAO.updateWorkflow(workflowId, updateData);
};

const deleteWorkflowService = async (workflowId, userId) => {
    const workflow = await getWorkflowByIdService(workflowId, userId); // Re-uses access check

    const project = await projectDAO.getProjectById(workflow.projectId);
    const leader = project.members.find(m => m.accountId.equals(userId));
    if (!leader || leader.role !== "leader") {
        throw new ApiError(StatusCodes.FORBIDDEN, "Only project leader can delete workflows.");
    }

    // Prevent deleting the active workflow
    if (project.activeWorkflowId && project.activeWorkflowId.equals(workflowId)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Cannot delete the active workflow. Please switch to another workflow first.");
    }

    await workflowDAO.deleteWorkflow(workflowId);
    return { message: "Workflow deleted successfully." };
};

const applyWorkflowToProjectService = async (projectId, workflowId, userId) => {
    const project = await projectDAO.getProjectById(projectId);
    if (!project) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project.");
    }
    const leader = project.members.find(m => m.accountId.equals(userId));
    if (!leader || leader.role !== "leader") {
        throw new ApiError(StatusCodes.FORBIDDEN, "Only project leader can apply workflows.");
    }

    if (workflowId) { // Allow un-applying workflow by passing null/undefined
        const workflow = await workflowDAO.getWorkflowById(workflowId);
        if (!workflow || !workflow.projectId.equals(projectId)) {
            throw new ApiError(StatusCodes.NOT_FOUND, "Workflow not found in this project.");
        }
    }

    return await projectDAO.updateProject(projectId, { activeWorkflowId: workflowId });
};

module.exports = {
    createWorkflowService,
    getWorkflowsByProjectService,
    getWorkflowByIdService,
    updateWorkflowService,
    deleteWorkflowService,
    applyWorkflowToProjectService
};
