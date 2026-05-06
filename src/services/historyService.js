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

const createHistoryRecord = async (issueId, authorId, field, oldValue, newValue) => {
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

    await historyDAO.createHistory(historyData);
};

const getHistoryByIssueService = async (issueId, userId) => {
    const issue = await issueDAO.getIssueById(issueId);
    if (!issue) throw new ApiError(StatusCodes.NOT_FOUND, "Issue not found.");

    const hasAccess = await projectDAO.isMemberOfProject(issue.projectId, userId);
    if (!hasAccess) throw new ApiError(StatusCodes.FORBIDDEN, "You are not a member of this project.");

    return await historyDAO.getHistoryByIssueId(issueId);
};

module.exports = { createHistoryRecord, getHistoryByIssueService };