const mongoose = require("mongoose");

const messageTemplateSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
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
        channels: {
            type: [String],
            enum: ["In-App", "Email"],
            default: ["In-App"],
        },
        active: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        collection: "tblmessagetemplates",
    }
);

module.exports = mongoose.model("MessageTemplate", messageTemplateSchema);
