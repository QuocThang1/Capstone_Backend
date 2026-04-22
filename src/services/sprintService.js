const sprintDAO = require("../DAO/sprintDAO");
const projectDAO = require("../DAO/projectDAO");
const issueDAO = require("../DAO/issueDAO");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");

const createSprintService = async (projectId, sprintData, userId) => {
    const { name, startDate, endDate, goal } = sprintData;

    // Kiểm tra user có quyền truy cập project không
    const project = await projectDAO.checkMemberExists(projectId, userId);
    if (!project) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project.");
    }

    // Kiểm tra trùng tên sprint trong project
    const existingSprint = await sprintDAO.findSprintByName(projectId, name);
    if (existingSprint) {
        throw new ApiError(StatusCodes.CONFLICT, `A sprint with the name "${name}" already exists in this project.`);
    }

    const newSprintData = {
        projectId,
        name,
        startDate,
        endDate,
        goal
    };

    const newSprint = await sprintDAO.createSprint(newSprintData);
    return newSprint;
};

const getSprintsByProjectService = async (projectId, userId) => {
    // Kiểm tra user có quyền truy cập project không
    const project = await projectDAO.checkMemberExists(projectId, userId);
    if (!project) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project.");
    }

    const sprints = await sprintDAO.getSprintsByProjectId(projectId);
    return sprints;
};


const updateSprintService = async (sprintId, updateData, userId) => {
    const { name } = updateData;

    const sprint = await sprintDAO.getSprintById(sprintId);
    if (!sprint) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Sprint not found.");
    }

    // Không cho sửa Backlog
    if (sprint.name === 'Backlog') {
        throw new ApiError(StatusCodes.FORBIDDEN, "The Backlog cannot be modified.");
    }

    // Kiểm tra user có quyền truy cập project không
    const project = await projectDAO.checkMemberExists(sprint.projectId, userId);
    if (!project) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project.");
    }

    // Nếu đổi tên, kiểm tra trùng tên trong project
    if (name && name !== sprint.name) {
        const existingSprint = await sprintDAO.findSprintByName(sprint.projectId, name);
        if (existingSprint) {
            throw new ApiError(StatusCodes.CONFLICT, `A sprint with the name "${name}" already exists in this project.`);
        }
    }

    // Kiểm tra trùng lặp khoảng thời gian
    const checkStartDate = updateData.startDate;
    const checkEndDate = updateData.endDate;

    if (checkStartDate && checkEndDate) {
        if (checkStartDate >= checkEndDate) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Start date must be before end date.");
        }

        const overlappingSprints = await sprintDAO.findOverlappingSprints(
            sprint.projectId,
            checkStartDate,
            checkEndDate,
            sprintId
        );

        if (overlappingSprints.length > 0) {
            throw new ApiError(StatusCodes.CONFLICT, `The new dates overlap with sprint "${overlappingSprints[0].name}".`);
        }
    }

    const updatedSprint = await sprintDAO.updateSprint(sprintId, updateData);
    return updatedSprint;
};

const deleteSprintService = async (sprintId, userId) => {
    const sprint = await sprintDAO.getSprintById(sprintId);
    if (!sprint) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Sprint not found.");
    }

    // Không cho xóa Backlog
    if (sprint.name === 'Backlog') {
        throw new ApiError(StatusCodes.FORBIDDEN, "The Backlog cannot be deleted.");
    }

    // Kiểm tra user có quyền truy cập project không
    const project = await projectDAO.checkMemberExists(sprint.projectId, userId);
    if (!project) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project.");
    }

    // Chuyển issue trong sprint bị xóa về backlog
    const backlogSprint = await sprintDAO.findSprintByName(sprint.projectId, 'Backlog');
    if (!backlogSprint) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Could not find the Backlog sprint for this project.");
    }

    const filter = { sprintId: sprintId };
    const update = { $set: { sprintId: backlogSprint._id } };
    await issueDAO.updateManyIssues(filter, update);

    await sprintDAO.deleteSprint(sprintId);
    return { message: "Sprint deleted successfully." };
};


module.exports = {
    createSprintService,
    getSprintsByProjectService,
    updateSprintService,
    deleteSprintService,
};