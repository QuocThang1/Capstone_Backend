const issueDAO = require("../DAO/issueDAO");
const projectDAO = require("../DAO/projectDAO");
const sprintDAO = require("../DAO/sprintDAO");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");

// src/services/issueService.js

const createIssueService = async (issueData, creatorId) => {
    const { projectId, sprintId, title, type, parentId } = issueData;

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
        if (!sprint || sprint.projectId.toString() !== projectId.toString()) {
            throw new ApiError(StatusCodes.NOT_FOUND, "Sprint not found in this project.");
        }
    }

    //Lấy và tăng số thứ tự issue của project
    const updatedProject = await projectDAO.incrementIssueSequence(projectId);
    const issueSequence = updatedProject.issueSequence;

    //Tạo issueKey
    const issueKey = `${project.key}-${issueSequence}`;

    const newIssueData = {
        ...issueData,
        projectId,
        sprintId,
        parentId,
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

// src/services/issueService.js

// ... các hàm khác

const updateIssueService = async (issueId, updateData, userId) => {
    const issue = await issueDAO.getIssueById(issueId);
    if (!issue) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Issue not found.");
    }

    // Kiểm tra quyền: user phải là thành viên của project
    const hasAccess = await projectDAO.isMemberOfProject(issue.projectId, userId);
    if (!hasAccess) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project.");
    }

    // Nếu có `assigneeId` trong data update, kiểm tra xem assignee đó có phải là member của project không
    if (updateData.assigneeId) {
        const isAssigneeMember = await projectDAO.isMemberOfProject(issue.projectId, updateData.assigneeId);
        if (!isAssigneeMember) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Assignee must be a member of the project.");
        }
    }

    return await issueDAO.updateIssue(issueId, updateData);
};


const deleteIssueService = async (issueId, userId) => {
    const issue = await issueDAO.getIssueById(issueId);
    if (!issue) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Issue not found.");
    }

    // Kiểm tra quyền: user phải là thành viên của project
    const hasAccess = await projectDAO.isMemberOfProject(issue.projectId, userId);
    if (!hasAccess) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project.");
    }

    // Nếu issue này là một task cha (không có parentId), xóa tất cả sub-task của nó
    if (!issue.parentId) {
        await issueDAO.deleteManyIssues({ parentId: issueId });
    }

    // Xóa issue chính
    await issueDAO.deleteIssue(issueId);

    return { message: "Issue and its sub-tasks deleted successfully." };
};

const createSubtaskService = async (issueData, creatorId) => {
    const { parentId, title } = issueData;

    if (!parentId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Parent issue ID is required to create a sub-task.");
    }

    // Lấy thông tin task cha
    const parentIssue = await issueDAO.getIssueById(parentId);
    if (!parentIssue) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Parent issue not found.");
    }

    // Sub-task không thể có sub-task (chỉ hỗ trợ 1 cấp)
    if (parentIssue.parentId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Cannot create a sub-task for another sub-task.");
    }

    // Dùng lại hàm createIssueService nhưng thêm parentId và các thông tin kế thừa từ task cha
    const subtaskData = {
        ...issueData,
        projectId: parentIssue.projectId,
        type: "Sub-task",
        title,
    };

    // Gọi hàm tạo issue gốc
    return await createIssueService(subtaskData, creatorId);
};

const getSubtasksService = async (parentId, userId) => {
    // Kiểm tra xem task cha có tồn tại không
    const parentIssue = await issueDAO.getIssueById(parentId);
    if (!parentIssue) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Parent issue not found.");
    }

    // Kiểm tra xem người dùng có quyền truy cập vào project của task cha không
    const hasAccess = await projectDAO.isMemberOfProject(parentIssue.projectId, userId);
    if (!hasAccess) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project.");
    }

    // Lấy danh sách các sub-task
    const subtasks = await issueDAO.getSubtasks(parentId);
    return subtasks;
};

module.exports = {
    createIssueService,
    getIssuesBySprintService,
    getIssuesByProjectService,
    updateIssueService,
    deleteIssueService,
    createSubtaskService,
    getSubtasksService
};