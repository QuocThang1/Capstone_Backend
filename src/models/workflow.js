const mongoose = require("mongoose");
const transitionSchema = require("./transitions");

const workflowSchema = new mongoose.Schema(
    {
        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        transitions: [transitionSchema],
    },
    {
        timestamps: true,
        collection: "tblworkflow",
    }
);

workflowSchema.index({ projectId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Workflow", workflowSchema);