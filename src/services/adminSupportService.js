const mongoose = require("mongoose");
const { StatusCodes } = require("http-status-codes");
const ApiError = require("../utils/ApiError");
const SupportTicket = require("../models/supportTicket");
const transporter = require("../utils/mailer");

const normalizeTicket = (ticket) => ({
    id: ticket._id.toString(),
    ticketCode: ticket.ticketCode,
    subject: ticket.subject,
    description: ticket.description,
    organization: ticket.organization,
    user: ticket.reporterEmail,
    priority: ticket.priority,
    status: ticket.status,
    assignedTo: ticket.assignedTo?.fullName || ticket.assignedTo?.email || "Unassigned",
    assignedToId: ticket.assignedTo?._id?.toString?.() || null,
    resolvedAt: ticket.resolvedAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
});

const createSupportTicketService = async (data) => {
    const ticket = await SupportTicket.create({
        ticketCode: `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        subject: data.subject,
        description: data.description,
        organization: data.organization,
        reporterEmail: data.reporterEmail,
        priority: data.priority,
    });
    return normalizeTicket(ticket);
};

const getAllSupportTicketsService = async (query = {}) => {
    const { page = 1, limit = 20, search, status, priority } = query;
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const filter = {};

    if (search) {
        filter.$or = [
            { ticketCode: { $regex: search, $options: "i" } },
            { subject: { $regex: search, $options: "i" } },
            { organization: { $regex: search, $options: "i" } },
            { reporterEmail: { $regex: search, $options: "i" } },
        ];
    }
    if (status && status !== "all") filter.status = status;
    if (priority && priority !== "all") filter.priority = priority;

    const [tickets, total] = await Promise.all([
        SupportTicket.find(filter)
            .populate("assignedTo", "fullName email")
            .sort({ createdAt: -1 })
            .skip((currentPage - 1) * pageSize)
            .limit(pageSize),
        SupportTicket.countDocuments(filter),
    ]);

    return {
        tickets: tickets.map(normalizeTicket),
        total,
        page: currentPage,
        pageSize,
    };
};

const getSupportTicketByIdService = async (ticketId) => {
    const ticket = await SupportTicket.findById(ticketId).populate("assignedTo", "fullName email");
    if (!ticket) throw new ApiError(StatusCodes.NOT_FOUND, "Support ticket not found");
    return normalizeTicket(ticket);
};

const updateSupportTicketService = async (ticketId, data) => {
    const update = {};
    ["subject", "description", "organization", "reporterEmail", "priority", "status"].forEach((field) => {
        if (data[field] !== undefined) update[field] = data[field];
    });
    if (data.status === "Resolved" || data.status === "Closed") update.resolvedAt = new Date();

    const ticket = await SupportTicket.findByIdAndUpdate(
        ticketId,
        { $set: update },
        { returnDocument: "after", runValidators: true }
    ).populate("assignedTo", "fullName email");
    if (!ticket) throw new ApiError(StatusCodes.NOT_FOUND, "Support ticket not found");
    return normalizeTicket(ticket);
};

const closeSupportTicketService = (ticketId) => updateSupportTicketService(ticketId, { status: "Resolved" });

const assignSupportTicketService = async (ticketId, assigneeId) => {
    const ticket = await SupportTicket.findByIdAndUpdate(
        ticketId,
        { $set: { assignedTo: assigneeId || null, status: assigneeId ? "In Progress" : "Open" } },
        { returnDocument: "after", runValidators: true }
    ).populate("assignedTo", "fullName email");
    if (!ticket) throw new ApiError(StatusCodes.NOT_FOUND, "Support ticket not found");
    return normalizeTicket(ticket);
};

const checkMailTransport = async () => {
    await transporter.verify();
    return { key: "mail", label: "Mail Transport", status: "Operational", detail: "SMTP connection verified" };
};

const checkWebSockets = async (io) => ({
    key: "websocket",
    label: "WebSocket Server",
    status: io ? "Operational" : "Down",
    detail: `${io?.engine?.clientsCount || 0} active connections`,
});

const checkDatabaseIndexes = async () => {
    if (mongoose.connection.readyState !== 1) {
        throw new Error("MongoDB is not connected");
    }

    const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
    const indexGroups = await Promise.all(collections.map(async ({ name }) => {
        const indexes = await mongoose.connection.db.collection(name).listIndexes().toArray();
        return { name, indexes: indexes.length };
    }));
    const totalIndexes = indexGroups.reduce((total, collection) => total + collection.indexes, 0);

    return {
        key: "database-indexes",
        label: "Database Indexes",
        status: "Operational",
        detail: `${totalIndexes} indexes across ${collections.length} collections`,
    };
};

const runCheck = async (check) => {
    try {
        return await check();
    } catch (error) {
        return {
            key: "diagnostic",
            label: "Diagnostic",
            status: "Failed",
            detail: error.message,
        };
    }
};

const runSupportDiagnosticService = async (diagnostic, io) => {
    const checks = {
        mail: () => checkMailTransport(),
        websocket: () => checkWebSockets(io),
        "database-indexes": () => checkDatabaseIndexes(),
    };

    if (diagnostic === "full") {
        const results = await Promise.all(Object.values(checks).map(runCheck));
        return {
            diagnostic,
            status: results.every((result) => result.status === "Operational") ? "Operational" : "Review Required",
            results,
        };
    }

    const check = checks[diagnostic];
    if (!check) throw new ApiError(StatusCodes.BAD_REQUEST, "Unknown support diagnostic");
    const result = await runCheck(check);
    return {
        diagnostic,
        status: result.status,
        results: [result],
    };
};

module.exports = {
    assignSupportTicketService,
    closeSupportTicketService,
    createSupportTicketService,
    getAllSupportTicketsService,
    getSupportTicketByIdService,
    runSupportDiagnosticService,
    updateSupportTicketService,
};
