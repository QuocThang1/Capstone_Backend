const historyDAO = require("../DAO/historyDAO");
const accountDAO = require("../DAO/accountDAO");
const sprintDAO = require("../DAO/sprintDAO");
const issueDAO = require("../DAO/issueDAO");
const projectDAO = require("../DAO/projectDAO");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");

const formatDate = (date) => {
    if (!date) return null;
    try {
        return new Date(date).toISOString();
    } catch (error) {
        return null;
    }
};

const createHistoryRecord = async (issueId, authorId, field, oldValue, newValue, io) => {
    // Chuyển đổi giá trị ID thành tên để hiển thị (nếu cần)
    let oldDisplay = oldValue;
    let newDisplay = newValue;

    // Xử lý cho trường Assignee
    if (field === 'Assignee') {
        oldDisplay = oldValue ? (await accountDAO.getAccountByID(oldValue))?.fullName || 'Unassigned' : 'Unassigned';
        newDisplay = newValue ? (await accountDAO.getAccountByID(newValue))?.fullName || 'Unassigned' : 'Unassigned';
    }
    // Xử lý cho trường Sprint
    else if (field === 'Sprint') {
        oldDisplay = oldValue ? (await sprintDAO.getSprintById(oldValue))?.name || 'None' : 'None';
        newDisplay = newValue ? (await sprintDAO.getSprintById(newValue))?.name || 'None' : 'None';
    }
    else if (field === 'Start Date' || field === 'Due Date') {
        oldDisplay = formatDate(oldValue) || 'None';
        newDisplay = formatDate(newValue) || 'None';
    }
    // Xử lý cho trường Required Skills (Mảng)
    else if (field === 'Required Skills') {
        oldDisplay = Array.isArray(oldValue) ? oldValue.join(', ') : oldValue || 'None';
        newDisplay = Array.isArray(newValue) ? newValue.join(', ') : newValue || 'None';
    }
    // Xử lý cho các trường có giá trị rỗng/null
    else {
        oldDisplay = oldValue || "None";
        newDisplay = newValue || "None";
    }

    // Không tạo bản ghi nếu giá trị không đổi
    if (oldDisplay === newDisplay) {
        return;
    }

    const historyData = {
        issueId,
        authorId,
        field,
        oldValue: oldDisplay,
        newValue: newDisplay,
    };

    const savedHistory = await historyDAO.createHistory(historyData);
    try {
        const issueInfo = await issueDAO.getIssueById(issueId);

        if (issueInfo && io) {
            const newHistoryForEmit = {
                ...savedHistory.toObject(),
                authorId: await accountDAO.getAccountByID(authorId),
                issueId: {
                    _id: issueInfo._id,
                    issueKey: issueInfo.issueKey,
                    title: issueInfo.title
                }
            };

            io.to(`project_history_${issueInfo.projectId.toString()}`).emit('new_project_history', newHistoryForEmit);

            if (issueInfo.sprintId) {
                io.to(`sprint_history_${issueInfo.sprintId.toString()}`).emit('new_sprint_history', newHistoryForEmit);
            }
        }
    } catch (err) {
        console.error("Socket emit history error: ", err);
    }
};

const getHistoryByIssueService = async (issueId, userId) => {
    const issue = await issueDAO.getIssueById(issueId);
    if (!issue) throw new ApiError(StatusCodes.NOT_FOUND, "Issue not found.");

    const hasAccess = await projectDAO.isMemberOfProject(issue.projectId, userId);
    if (!hasAccess) throw new ApiError(StatusCodes.FORBIDDEN, "You are not a member of this project.");

    return await historyDAO.getHistoryByIssueId(issueId);
};

const getHistoryByProjectService = async (projectId, userId, filters = {}) => {
    const project = await projectDAO.getProjectById(projectId);
    if (!project) throw new ApiError(StatusCodes.NOT_FOUND, "Project not found.");

    const isMember = project.members.some(m => m.accountId._id.toString() === userId.toString());
    if (!isMember) throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project.");

    return await historyDAO.getHistoryByProjectId(projectId, filters);
};


module.exports = { createHistoryRecord, getHistoryByIssueService, getHistoryByProjectService };