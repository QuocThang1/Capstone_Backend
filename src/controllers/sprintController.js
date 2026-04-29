const {
    createSprintService,
    getSprintsByProjectService,
    updateSprintService,
    deleteSprintService,
    startSprintService,
    completeSprintService
} = require("../services/sprintService");
const { StatusCodes } = require("http-status-codes");

const createSprint = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const userId = req.user._id;
        const sprintData = req.body;

        const sprint = await createSprintService(projectId, sprintData, userId);

        return res.status(StatusCodes.CREATED).json({
            EC: 0,
            EM: "Sprint created successfully",
            data: sprint
        });
    } catch (error) {
        next(error);
    }
};

const getSprintsByProject = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const userId = req.user._id;

        const sprints = await getSprintsByProjectService(projectId, userId);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Success",
            data: sprints
        });
    } catch (error) {
        next(error);
    }
};

const updateSprint = async (req, res, next) => {
    try {
        const { sprintId } = req.params;
        const userId = req.user._id;
        const updateData = req.body;

        const sprint = await updateSprintService(sprintId, updateData, userId);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Sprint updated successfully",
            data: sprint
        });
    } catch (error) {
        next(error);
    }
};

const deleteSprint = async (req, res, next) => {
    try {
        const { sprintId } = req.params;
        const userId = req.user._id;

        const result = await deleteSprintService(sprintId, userId);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: result.message,
            data: null
        });
    } catch (error) {
        next(error);
    }
};

const startSprint = async (req, res, next) => {
    try {
        const { sprintId } = req.params;
        const userId = req.user._id;

        const sprint = await startSprintService(sprintId, userId);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Sprint started successfully",
            data: sprint
        });
    } catch (error) {
        next(error);
    }
};

const completeSprint = async (req, res, next) => {
    try {
        const { sprintId } = req.params;
        const userId = req.user._id;

        const result = await completeSprintService(sprintId, userId);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: `Sprint completed. ${result.movedIssuesCount} issues moved to backlog.`,
            data: result.sprint
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createSprint,
    getSprintsByProject,
    updateSprint,
    deleteSprint,
    startSprint,
    completeSprint
};