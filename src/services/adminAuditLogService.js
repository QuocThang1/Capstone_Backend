const AuditLog = require("../models/auditLog");
const SystemSettings = require("../models/systemSettings");
const { getClientIp } = require("../utils/getClientIp");

const normalizeAuditLog = (log) => ({
    id: log._id.toString(),
    actorId: log.actorId?.toString?.() || null,
    actor: log.actor,
    action: log.action,
    target: log.target,
    severity: log.severity,
    details: log.details,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    timestamp: log.createdAt,
});

const createAuditLog = async (req, {
    actorId,
    actor,
    action,
    target,
    severity = "Info",
    details = "",
    io,
}) => {
    const settings = await SystemSettings.findOne({ key: "platform" }).select("enableAuditLogging");
    if (settings && !settings.enableAuditLogging) return null;

    const log = await AuditLog.create({
        actorId: actorId || null,
        actor: actor || "System",
        action,
        target,
        severity,
        details,
        ipAddress: getClientIp(req),
        userAgent: req?.headers?.["user-agent"] || "Unknown",
    });
    const normalizedLog = normalizeAuditLog(log);

    const socketServer = io || req?.app?.get?.("io");
    if (socketServer) {
        socketServer.to("admin_audit_logs").emit("new_audit_log", normalizedLog);
    }

    return normalizedLog;
};

const getAllAuditLogsService = async (query = {}) => {
    const { page = 1, limit = 20, search, severity } = query;
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const filter = {};

    if (search) {
        filter.$or = [
            { actor: { $regex: search, $options: "i" } },
            { action: { $regex: search, $options: "i" } },
            { target: { $regex: search, $options: "i" } },
            { details: { $regex: search, $options: "i" } },
        ];
    }
    if (severity && severity !== "all") filter.severity = severity;

    const [logs, total] = await Promise.all([
        AuditLog.find(filter)
            .sort({ createdAt: -1 })
            .skip((currentPage - 1) * pageSize)
            .limit(pageSize),
        AuditLog.countDocuments(filter),
    ]);

    return {
        logs: logs.map(normalizeAuditLog),
        total,
        page: currentPage,
        pageSize,
    };
};

const getAuditLogByIdService = async (logId) => {
    const log = await AuditLog.findById(logId);
    return log ? normalizeAuditLog(log) : null;
};

module.exports = {
    createAuditLog,
    getAllAuditLogsService,
    getAuditLogByIdService,
};
