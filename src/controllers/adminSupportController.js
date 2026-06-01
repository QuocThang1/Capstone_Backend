const { StatusCodes } = require("http-status-codes");
const {
    assignSupportTicketService,
    closeSupportTicketService,
    createSupportTicketService,
    getAllSupportTicketsService,
    getSupportTicketByIdService,
    runSupportDiagnosticService,
    updateSupportTicketService,
} = require("../services/adminSupportService");
const { createAuditLog } = require("../services/adminAuditLogService");

const sendSuccess = (res, data, message = "Success") => res.status(StatusCodes.OK).json({
    EC: 0,
    EM: message,
    data,
});

const getAllSupportTickets = async (req, res, next) => {
    try {
        return sendSuccess(res, await getAllSupportTicketsService(req.query));
    } catch (error) {
        next(error);
    }
};

const createSupportTicket = async (req, res, next) => {
    try {
        return res.status(StatusCodes.CREATED).json({
            EC: 0,
            EM: "Support ticket created",
            data: await createSupportTicketService(req.body),
        });
    } catch (error) {
        next(error);
    }
};

const getSupportTicketById = async (req, res, next) => {
    try {
        return sendSuccess(res, await getSupportTicketByIdService(req.params.ticketId));
    } catch (error) {
        next(error);
    }
};

const updateSupportTicket = async (req, res, next) => {
    try {
        return sendSuccess(res, await updateSupportTicketService(req.params.ticketId, req.body), "Support ticket updated");
    } catch (error) {
        next(error);
    }
};

const closeSupportTicket = async (req, res, next) => {
    try {
        return sendSuccess(res, await closeSupportTicketService(req.params.ticketId), "Support ticket resolved");
    } catch (error) {
        next(error);
    }
};

const assignSupportTicket = async (req, res, next) => {
    try {
        return sendSuccess(res, await assignSupportTicketService(req.params.ticketId, req.body.assigneeId), "Support ticket assigned");
    } catch (error) {
        next(error);
    }
};

const runSupportDiagnostic = async (req, res, next) => {
    try {
        const result = await runSupportDiagnosticService(req.params.diagnostic, req.app.get("io"));
        await createAuditLog(req, {
            actorId: req.user?._id,
            actor: req.user?.fullName || req.user?.email || "Admin",
            action: "Support diagnostic executed",
            target: req.params.diagnostic,
            severity: result.status === "Operational" ? "Info" : "Warning",
            details: result.results.map((item) => `${item.label}: ${item.status}`).join(", "),
        });
        return sendSuccess(res, result, "Diagnostic completed");
    } catch (error) {
        next(error);
    }
};

module.exports = {
    assignSupportTicket,
    closeSupportTicket,
    createSupportTicket,
    getAllSupportTickets,
    getSupportTicketById,
    runSupportDiagnostic,
    updateSupportTicket,
};
