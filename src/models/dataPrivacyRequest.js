const mongoose = require("mongoose");

const dataPrivacyRequestSchema = new mongoose.Schema(
    {
        organization: {
            type: String,
            required: true,
            trim: true,
        },
        requestType: {
            type: String,
            enum: ["Export Data", "Delete Data", "Backup Restore"],
            required: true,
        },
        requestedBy: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        status: {
            type: String,
            enum: ["Pending", "Processing", "Completed", "Rejected"],
            default: "Pending",
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            default: null,
        },
        reviewedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: "tbldataprivacyrequests",
    }
);

dataPrivacyRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("DataPrivacyRequest", dataPrivacyRequestSchema);
