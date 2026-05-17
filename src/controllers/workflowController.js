const workflowService = require("../services/workflowService");
const { StatusCodes } = require("http-status-codes");

const createWorkflow = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const workflow = await workflowService.createWorkflowService(projectId, req.body, req.user._id);
        res.status(StatusCodes.CREATED).json({ EC: 0, EM: "Workflow created", data: workflow });
    } catch (error) { next(error); }
};

const getWorkflowsByProject = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const workflows = await workflowService.getWorkflowsByProjectService(projectId, req.user._id);
        res.status(StatusCodes.OK).json({ EC: 0, EM: "Success", data: workflows });
    } catch (error) { next(error); }
};

const getWorkflowById = async (req, res, next) => {
    try {
        const { workflowId } = req.params;
        const workflow = await workflowService.getWorkflowByIdService(workflowId, req.user._id);
        res.status(StatusCodes.OK).json({ EC: 0, EM: "Success", data: workflow });
    } catch (error) { next(error); }
};

const updateWorkflow = async (req, res, next) => {
    try {
        const { workflowId } = req.params;
        const workflow = await workflowService.updateWorkflowService(workflowId, req.body, req.user._id);
        res.status(StatusCodes.OK).json({ EC: 0, EM: "Workflow updated", data: workflow });
    } catch (error) { next(error); }
};

const deleteWorkflow = async (req, res, next) => {
    try {
        const { workflowId } = req.params;
        const result = await workflowService.deleteWorkflowService(workflowId, req.user._id);
        res.status(StatusCodes.OK).json({ EC: 0, EM: result.message, data: null });
    } catch (error) { next(error); }
};

const applyWorkflow = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { workflowId } = req.body;
        const project = await workflowService.applyWorkflowToProjectService(projectId, workflowId, req.user._id);
        res.status(StatusCodes.OK).json({ EC: 0, EM: "Workflow applied successfully", data: project });
    } catch (error) { next(error); }
};

module.exports = { createWorkflow, getWorkflowsByProject, getWorkflowById, updateWorkflow, deleteWorkflow, applyWorkflow };