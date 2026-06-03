const { StatusCodes } = require("http-status-codes");
const ApiError = require("../utils/ApiError");
const {
    getAllAuditLogsService,
    getAuditLogByIdService,
} = require("../services/adminAuditLogService");

const getAllAuditLogs = async (req, res, next) => {
    try {
        const result = await getAllAuditLogsService(req.query);
        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Success",
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

const getAuditLogById = async (req, res, next) => {
    try {
        const log = await getAuditLogByIdService(req.params.logId);
        if (!log) throw new ApiError(StatusCodes.NOT_FOUND, "Audit log not found");
        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Success",
            data: log,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllAuditLogs,
    getAuditLogById,
};
