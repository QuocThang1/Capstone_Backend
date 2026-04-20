const { createIssueService,
    getIssuesBySprintService,
    getIssuesByProjectService
} = require("../services/issueService");
const { StatusCodes } = require("http-status-codes");

const createIssue = async (req, res, next) => {
    try {
        const creatorId = req.user._id;
        const issueData = req.body;

        const issue = await createIssueService(issueData, creatorId);

        return res.status(StatusCodes.CREATED).json({
            EC: 0,
            EM: "Issue created successfully",
            data: issue
        });
    } catch (error) {
        next(error);
    }
};

const getIssuesBySprint = async (req, res, next) => {
    try {
        const { sprintId } = req.params;
        const userId = req.user._id;
        const issues = await getIssuesBySprintService(sprintId, userId);
        return res.status(StatusCodes.OK).json({ EC: 0, EM: "Success", data: issues });
    } catch (error) {
        next(error);
    }
};

const getIssuesByProject = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const userId = req.user._id;
        const issues = await getIssuesByProjectService(projectId, userId);
        return res.status(StatusCodes.OK).json({ EC: 0, EM: "Success", data: issues });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createIssue,
    getIssuesBySprint,
    getIssuesByProject
};