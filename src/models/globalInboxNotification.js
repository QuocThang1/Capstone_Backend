const mongoose = require("mongoose");

const globalInboxNotificationSchema = new mongoose.Schema(
    {
        recipientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            required: true,
        },
        globalNotificationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "GlobalNotification",
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            default: "Info",
        },
    },
    {
        timestamps: true,
        collection: "tblglobalinboxnotifications",
    }
);

globalInboxNotificationSchema.index({ recipientId: 1, globalNotificationId: 1 }, { unique: true });

module.exports = mongoose.model("GlobalInboxNotification", globalInboxNotificationSchema);
