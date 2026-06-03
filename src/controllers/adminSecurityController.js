const { StatusCodes } = require("http-status-codes");
const {
    getDataSecurityService,
    getAllDataRequestsService,
    getDataRequestByIdService,
    reviewDataRequestService,
} = require("../services/adminSecurityService");
const { createAuditLog } = require("../services/adminAuditLogService");

const writeAuditLog = (req, data) => createAuditLog(req, {
    actorId: req.user?._id,
    actor: req.user?.fullName || req.user?.email || "Admin",
    ...data,
}).catch((error) => console.error("Unable to write audit log:", error.message));

const sendSuccess = (res, data, message = "Success") => res.status(StatusCodes.OK).json({
    EC: 0,
    EM: message,
    data,
});

const getDataSecurity = async (req, res, next) => {
    try {
        return sendSuccess(res, await getDataSecurityService());
    } catch (error) {
        next(error);
    }
};

const getAllDataRequests = async (req, res, next) => {
    try {
        return sendSuccess(res, await getAllDataRequestsService());
    } catch (error) {
        next(error);
    }
};

const getDataRequestById = async (req, res, next) => {
    try {
        return sendSuccess(res, await getDataRequestByIdService(req.params.requestId));
    } catch (error) {
        next(error);
    }
};

const reviewDataRequest = (action) => async (req, res, next) => {
    try {
        const request = await reviewDataRequestService(req.params.requestId, action, req.user._id);
        await writeAuditLog(req, {
            action: action === "approve" ? "Data privacy request approved" : "Data privacy request rejected",
            target: `${request.organization} - ${request.requestType}`,
            severity: action === "approve" ? "Info" : "Warning",
            details: `${action === "approve" ? "Approved" : "Rejected"} data privacy request from ${request.requestedBy}.`,
        });
        return sendSuccess(res, request, `Request ${action === "approve" ? "approved for processing" : "rejected"}`);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDataSecurity,
    getAllDataRequests,
    getDataRequestById,
    approveDataRequest: reviewDataRequest("approve"),
    rejectDataRequest: reviewDataRequest("reject"),
};
