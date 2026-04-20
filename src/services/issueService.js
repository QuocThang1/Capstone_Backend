const issueDAO = require("../DAO/issueDAO");
const projectDAO = require("../DAO/projectDAO");
const sprintDAO = require("../DAO/sprintDAO");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");

const createIssueService = async (issueData, creatorId) => {
    const { projectId, sprintId, title, type } = issueData;

    //Kiểm tra sự tồn tại của Project và quyền của user
    const project = await projectDAO.getProjectById(projectId);
    if (!project) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Project not found.");
    }
    const isMember = project.members.some(m => m.accountId._id.toString() === creatorId.toString());
    if (!isMember) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You are not a member of this project.");
    }

    //Kiểm tra sự tồn tại của Sprint nếu có sprintId
    if (sprintId) {
        const sprint = await sprintDAO.getSprintById(sprintId);
        if (!sprint || sprint.projectId.toString() !== projectId) {
            throw new ApiError(StatusCodes.NOT_FOUND, "Sprint not found in this project.");
        }
    }

    //Lấy và tăng số thứ tự issue của project
    const updatedProject = await projectDAO.incrementIssueSequence(projectId);
    const issueSequence = updatedProject.issueSequence;

    //Tạo issueKey
    const issueKey = `${project.key}-${issueSequence}`;

    const newIssueData = {
        projectId,
        sprintId,
        issueKey,
        title,
        type,
        reporterId: creatorId,
    };

    const newIssue = await issueDAO.createIssue(newIssueData);
    return newIssue;
};

const getIssuesBySprintService = async (sprintId, userId) => {
    const sprint = await sprintDAO.getSprintById(sprintId);
    if (!sprint) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Sprint not found.");
    }

    // Kiểm tra user có quyền truy cập project chứa sprint này không
    const project = await projectDAO.checkMemberExists(sprint.projectId, userId);
    if (!project) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project.");
    }

    const filter = { projectId: sprint.projectId, sprintId }

    return await issueDAO.getIssues(filter);
};

const getIssuesByProjectService = async (projectId, userId) => {
    // Kiểm tra user có quyền truy cập project không
    const project = await projectDAO.checkMemberExists(projectId, userId);
    if (!project) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project.");
    }

    return await issueDAO.getIssues({ projectId });
};

module.exports = {
    createIssueService,
    getIssuesBySprintService,
    getIssuesByProjectService
};