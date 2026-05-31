const { StatusCodes } = require("http-status-codes");
const intelligenceDetectAgentService = require("../services/intelligenceDetectAgentService");

const analyze = async (req, res, next) => {
    try {
        const result = await intelligenceDetectAgentService.analyze(
            req.body.query,
            req.body,
            req.user?._id
        );

        return res.status(StatusCodes.OK).json({
            EC: result?.metadata?.errors?.length ? 1 : 0,
            EM: result?.metadata?.errors?.length ? result.summary : "Bottleneck analysis completed",
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

const detect = async (req, res, next) => {
    try {
        const { projectId, boardId, sprintId, issueId, taskId, timeRange } = req.body;
        const result = await intelligenceDetectAgentService.detectBottlenecks(
            { projectId, boardId, sprintId, issueId, taskId },
            { timeRange },
            req.user?._id
        );

        return res.status(StatusCodes.OK).json({
            EC: result?.metadata?.errors?.length ? 1 : 0,
            EM: result?.metadata?.errors?.length ? result.summary : "Bottleneck detection completed",
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

const report = async (req, res, next) => {
    try {
        const { projectId, boardId, sprintId, issueId, taskId, timeRange, reportType } = req.body;
        const result = await intelligenceDetectAgentService.generateReport(
            { projectId, boardId, sprintId, issueId, taskId },
            { timeRange, reportType },
            req.user?._id
        );

        return res.status(StatusCodes.OK).json({
            EC: result?.metadata?.errors?.length ? 1 : 0,
            EM: result?.metadata?.errors?.length ? result.summary : "Bottleneck report generated",
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    analyze,
    detect,
    report,
};
