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

const startSprintService = async (sprintId, userId) => {
    const sprint = await sprintDAO.getSprintById(sprintId);
    if (!sprint) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Sprint not found.");
    }

    // Kiểm tra quyền truy cập
    const hasAccess = await projectDAO.checkMemberExists(sprint.projectId, userId);
    if (!hasAccess) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project.");
    }

    // Sprint phải ở trạng thái 'pending'
    if (sprint.status !== 'pending') {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Sprint has already been started or completed.");
    }

    // Sprint phải có ngày bắt đầu và kết thúc
    if (!sprint.startDate || !sprint.endDate) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Sprint must have a start date and an end date to begin.");
    }

    // Chỉ một sprint được chạy trong một project
    const activeSprint = await sprintDAO.findActiveSprintByProjectId(sprint.projectId);
    if (activeSprint) {
        throw new ApiError(StatusCodes.CONFLICT, `Cannot start sprint. Sprint "${activeSprint.name}" is already active.`);
    }

    // Phải có ít nhất 1 issue trong sprint
    const issueCount = await issueDAO.countIssuesBySprint(sprintId);
    if (issueCount === 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Cannot start a sprint with no issues.");
    }

    // Cập nhật trạng thái sprint thành 'active'
    const updatedSprint = await sprintDAO.updateSprint(sprintId, { status: 'active' });
    return updatedSprint;
};

const completeSprintService = async (sprintId, userId) => {
    const sprint = await sprintDAO.getSprintById(sprintId);
    if (!sprint) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Sprint not found.");
    }

    // Kiểm tra quyền truy cập
    const hasAccess = await projectDAO.checkMemberExists(sprint.projectId, userId);
    if (!hasAccess) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project.");
    }

    // Sprint phải ở trạng thái 'active'
    if (sprint.status !== 'active') {
        throw new ApiError(StatusCodes.BAD_REQUEST, "This sprint is not active.");
    }

    const allSprintIssues = await issueDAO.getIssues({ sprintId });
    const sprintIssueIds = allSprintIssues.map(issue => issue._id);

    if (sprintIssueIds.length > 0) {
        const unresolvedSubtasks = await issueDAO.getIssues({
            parentId: { $in: sprintIssueIds },
            resolution: { $ne: 'Done' }
        });

        if (unresolvedSubtasks.length > 0) {
            throw new ApiError(
                StatusCodes.BAD_REQUEST,
                `Cannot complete sprint. There are ${unresolvedSubtasks.length} unresolved sub-task(s) left. Please complete them first.`
            );
        }
    }

    // Tìm các issue chưa hoàn thành
    const unresolvedIssues = await issueDAO.getUnresolvedIssuesBySprint(sprintId);

    if (unresolvedIssues.length > 0) {
        // Tìm sprint 'Backlog'
        const backlogSprint = await sprintDAO.findSprintByName(sprint.projectId, 'Backlog');
        if (!backlogSprint) {
            throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Could not find the Backlog sprint for this project.");
        }

        // Chuyển các issue chưa hoàn thành về Backlog
        const issueIdsToMove = unresolvedIssues.map(issue => issue._id);
        await issueDAO.updateManyIssues(
            { _id: { $in: issueIdsToMove } },
            { $set: { sprintId: backlogSprint._id } }
        );
    }

    // Cập nhật trạng thái sprint thành 'completed'
    const completedSprint = await sprintDAO.updateSprint(sprintId, { status: 'completed' });
    return {
        sprint: completedSprint,
        movedIssuesCount: unresolvedIssues.length
    };
};

module.exports = {
    createSprintService,
    getSprintsByProjectService,
    updateSprintService,
    deleteSprintService,
    startSprintService,
    completeSprintService
};