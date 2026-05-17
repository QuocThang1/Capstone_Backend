const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            required: true,
        },
        issueId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Issue",
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            default: "DUE_TODAY",
        },
        notifiedDate: {
            type: String, // VD: "2026-05-04" để chống gửi trùng trong cùng 1 ngày
            required: true,
        },
    },
    {
        timestamps: true,
        collection: "tblnotification",
    }
);


notificationSchema.index({ recipientId: 1, issueId: 1, type: 1, notifiedDate: 1 }, { unique: true });

module.exports = mongoose.model("Notification", notificationSchema);