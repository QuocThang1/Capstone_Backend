const mongoose = require("mongoose");

const globalNotificationSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ["Info", "Warning", "Maintenance", "Critical"],
            default: "Info",
        },
        target: {
            type: String,
            enum: ["All Users", "Platform Admins", "Leaders"],
            default: "All Users",
        },
        channels: {
            type: [String],
            enum: ["In-App", "Email"],
            required: true,
        },
        status: {
            type: String,
            enum: ["Sent", "Partially Sent", "Failed"],
            default: "Sent",
        },
        recipientCount: {
            type: Number,
            default: 0,
        },
        emailSentCount: {
            type: Number,
            default: 0,
        },
        emailFailedCount: {
            type: Number,
            default: 0,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            required: true,
        },
        sentAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        collection: "tblglobalnotifications",
    }
);

globalNotificationSchema.index({ sentAt: -1 });

module.exports = mongoose.model("GlobalNotification", globalNotificationSchema);
