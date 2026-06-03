const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
    {
        actorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            default: null,
        },
        actor: {
            type: String,
            default: "System",
            trim: true,
        },
        action: {
            type: String,
            required: true,
            trim: true,
        },
        target: {
            type: String,
            required: true,
            trim: true,
        },
        severity: {
            type: String,
            enum: ["Info", "Warning", "Critical"],
            default: "Info",
        },
        details: {
            type: String,
            default: "",
            trim: true,
        },
        ipAddress: {
            type: String,
            default: "Unknown",
            trim: true,
        },
        userAgent: {
            type: String,
            default: "Unknown",
            trim: true,
        },
    },
    {
        timestamps: true,
        collection: "tblauditlogs",
    }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
