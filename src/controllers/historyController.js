const { getHistoryByIssueService, getHistoryByProjectService } = require("../services/historyService");
const { StatusCodes } = require("http-status-codes");

const getHistoryByIssue = async (req, res, next) => {
    try {
        const { issueId } = req.params;
        const userId = req.user._id;
        const history = await getHistoryByIssueService(issueId, userId);
        res.status(StatusCodes.OK).json({ EC: 0, EM: "Success", data: history });
    } catch (error) {
        next(error);
    }
};

const getHistoryByProject = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const userId = req.user._id;

        const filters = {
            sprintId: req.query.sprintId,
            days: req.query.days
        };

        const history = await getHistoryByProjectService(projectId, userId, filters);
        res.status(StatusCodes.OK).json({ EC: 0, EM: "Success", data: history });
    } catch (error) {
        next(error);
    }
};

module.exports = { getHistoryByIssue, getHistoryByProject };