const bottleneckService = require("../services/bottleneckService");
const { StatusCodes } = require("http-status-codes");

const getAllBottlenecks = async (req, res, next) => {
    try {
        const bottlenecks = await bottleneckService.getAllBottlenecksService();
        return res.status(StatusCodes.OK).json({ EC: 0, EM: "Fetch all bottlenecks successfully", data: bottlenecks });
    } catch (error) { next(error); }
};

const getBottlenecksByProject = async (req, res, next) => {
    try {
        const bottlenecks = await bottleneckService.getBottlenecksByProjectService(req.params.projectId);
        return res.status(StatusCodes.OK).json({ EC: 0, EM: "Fetch project bottlenecks successfully", data: bottlenecks });
    } catch (error) { next(error); }
};

const getMyBottlenecks = async (req, res, next) => {
    try {
        const bottlenecks = await bottleneckService.getMyBottlenecksService(req.user._id);
        return res.status(StatusCodes.OK).json({ EC: 0, EM: "Fetch my bottlenecks successfully", data: bottlenecks });
    } catch (error) { next(error); }
};

const getBottlenecksByIssue = async (req, res, next) => {
    try {
        const bottlenecks = await bottleneckService.getBottlenecksByIssueService(req.params.issueId);
        return res.status(StatusCodes.OK).json({ EC: 0, EM: "Fetch issue bottlenecks successfully", data: bottlenecks });
    } catch (error) { next(error); }
};

// User yêu cầu Resolve
const requestResolveBottleneck = async (req, res, next) => {
    try {
        const result = await bottleneckService.requestResolveBottleneckService(req.params.id, req.user._id);
        return res.status(StatusCodes.OK).json({ EC: 0, EM: "Resolve request submitted", data: result });
    } catch (error) { next(error); }
};

// Leader duyệt (True = Accept, False = Reject gửi ở Body)
const approveBottleneck = async (req, res, next) => {
    try {
        const { isApproved } = req.body; // frontend truyền `{ "isApproved": true }`
        const currentUserId = req.user._id; // id của người bấm nút duyệt

        const result = await bottleneckService.approveResolveBottleneckService(req.params.id, isApproved, currentUserId);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: `Bottleneck resolution was ${isApproved ? 'approved' : 'rejected'}.`,
            data: result
        });
    } catch (error) { next(error); }
};

module.exports = {
    getAllBottlenecks,
    getBottlenecksByProject,
    getMyBottlenecks,
    getBottlenecksByIssue,
    requestResolveBottleneck,
    approveBottleneck
};