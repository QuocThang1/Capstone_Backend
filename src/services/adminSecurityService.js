const { StatusCodes } = require("http-status-codes");
const ApiError = require("../utils/ApiError");
const AuditLog = require("../models/auditLog");
const DataPrivacyRequest = require("../models/dataPrivacyRequest");

const normalizeDataRequest = (request) => ({
    id: request._id.toString(),
    organization: request.organization,
    requestType: request.requestType,
    requestedBy: request.requestedBy,
    status: request.status,
    reviewedBy: request.reviewedBy?.toString?.() || null,
    reviewedAt: request.reviewedAt,
    createdAt: request.createdAt,
});

const getSecurityPosture = async () => {
    const mongoUri = process.env.MONGO_DB_URL || "";
    const hasMongoTls = mongoUri.startsWith("mongodb+srv://") || /[?&]tls=true(?:&|$)/i.test(mongoUri);
    const auditLogCount = await AuditLog.countDocuments();

    return [
        { key: "encryption-at-rest", title: "Encryption at Rest", status: hasMongoTls ? "Active" : "Review Required", tone: hasMongoTls ? "emerald" : "amber", icon: "lock" },
        { key: "encryption-in-transit", title: "Database TLS", status: hasMongoTls ? "Active" : "Review Required", tone: hasMongoTls ? "emerald" : "amber", icon: "shield" },
        { key: "automated-backups", title: "Automated Backups", status: mongoUri.startsWith("mongodb+srv://") ? "Provider Managed" : "Not Configured", tone: "indigo", icon: "database" },
        { key: "mfa-enforcement", title: "MFA Enforcement", status: "Not Configured", tone: "amber", icon: "file-key" },
        { key: "audit-logging", title: "Audit Logging", status: `${auditLogCount} Logs`, tone: auditLogCount > 0 ? "emerald" : "amber", icon: "file-check" },
        { key: "vulnerability-scans", title: "Vulnerability Scans", status: "Not Configured", tone: "amber", icon: "alert-triangle" },
    ];
};

const getAllDataRequestsService = async () => {
    const requests = await DataPrivacyRequest.find().sort({ createdAt: -1 });
    return requests.map(normalizeDataRequest);
};

const getDataRequestByIdService = async (requestId) => {
    const request = await DataPrivacyRequest.findById(requestId);
    if (!request) throw new ApiError(StatusCodes.NOT_FOUND, "Data privacy request not found");
    return normalizeDataRequest(request);
};

const reviewDataRequestService = async (requestId, action, reviewedBy) => {
    const status = action === "approve" ? "Processing" : "Rejected";
    const request = await DataPrivacyRequest.findOneAndUpdate(
        { _id: requestId, status: "Pending" },
        { $set: { status, reviewedBy, reviewedAt: new Date() } },
        { returnDocument: "after", runValidators: true }
    );

    if (!request) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Only pending data privacy requests can be reviewed");
    }

    return normalizeDataRequest(request);
};

const getDataSecurityService = async () => {
    const [posture, requests] = await Promise.all([
        getSecurityPosture(),
        getAllDataRequestsService(),
    ]);

    return { posture, requests };
};

module.exports = {
    getDataSecurityService,
    getAllDataRequestsService,
    getDataRequestByIdService,
    reviewDataRequestService,
};
