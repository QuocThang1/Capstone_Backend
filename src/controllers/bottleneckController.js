const bottleneckDAO = require("../DAO/bottleneckDAO");
const { StatusCodes } = require("http-status-codes");

const getAllBottlenecks = async (req, res, next) => {
    try {
        const bottlenecks = await bottleneckDAO.getAllBottlenecks();
        return res.status(StatusCodes.OK).json({ EC: 0, EM: "Fetch all bottlenecks successfully", data: bottlenecks });
    } catch (error) {
        next(error);
    }
};

const getBottlenecksByProject = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const bottlenecks = await bottleneckDAO.getBottlenecksByProjectId(projectId);

        return res.status(StatusCodes.OK).json({ EC: 0, EM: "Fetch project bottlenecks successfully", data: bottlenecks });
    } catch (error) {
        next(error);
    }
};

const getMyBottlenecks = async (req, res, next) => {
    try {
        const currentUserId = req.user._id;
        const bottlenecks = await bottleneckDAO.getBottlenecksByUserId(currentUserId);

        return res.status(StatusCodes.OK).json({ EC: 0, EM: "Fetch my bottlenecks successfully", data: bottlenecks });
    } catch (error) {
        next(error);
    }
};

const getBottlenecksByIssue = async (req, res, next) => {
    try {
        const { issueId } = req.params;
        const bottlenecks = await bottleneckDAO.getBottlenecksByIssueId(issueId);

        return res.status(StatusCodes.OK).json({ EC: 0, EM: "Fetch issue bottlenecks successfully", data: bottlenecks });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllBottlenecks,
    getMyBottlenecks,
    getBottlenecksByIssue,
    getBottlenecksByProject
};