const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
    {
        issueId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Issue",
            required: true,
            index: true,
        },
        authorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            required: true,
        },
        field: {
            type: String,
            required: true,
        },
        oldValue: {
            type: String,
            default: null,
        },
        newValue: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: "tblhistory",
    }
);

module.exports = mongoose.model("History", historySchema);