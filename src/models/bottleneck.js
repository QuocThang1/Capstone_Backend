const mongoose = require("mongoose");

const bottleneckSchema = new mongoose.Schema(
    {
        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
        },
        issueId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Issue",
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        content: {
            type: String,
            required: false,
        },
        level: {
            type: String,
            enum: ["Highest", "High", "Medium", "Low", "Lowest"],
            default: "Medium",
        },
        status: {
            type: String,
            enum: ["unresolved", "pending", "resolved"],
            default: "unresolved",
        },
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            default: null,
        },
    },
    {
        timestamps: true,
        collection: "tblbottleneck",
    }
);

// Thêm index để tối ưu tốc độ truy vấn bottleneck theo issueId (vì thường sẽ query các bottleneck của 1 issue cụ thể)
bottleneckSchema.index({ issueId: 1 });
bottleneckSchema.index({ projectId: 1 });

module.exports = mongoose.model("Bottleneck", bottleneckSchema);