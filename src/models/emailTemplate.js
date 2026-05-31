const mongoose = require("mongoose");

const emailTemplateSchema = new mongoose.Schema(
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
        subject: {
            type: String,
            required: true,
            trim: true,
        },
        text: {
            type: String,
            default: "",
        },
        html: {
            type: String,
            required: true,
        },
        variables: {
            type: [String],
            default: [],
        },
        active: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        collection: "tblemailtemplates",
    }
);

module.exports = mongoose.model("EmailTemplate", emailTemplateSchema);
