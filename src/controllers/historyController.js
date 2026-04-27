const { getHistoryByIssueService } = require("../services/historyService");
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

module.exports = { getHistoryByIssue };