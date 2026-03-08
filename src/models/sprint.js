const mongoose = require("mongoose");

const sprintSchema = new mongoose.Schema(
    {
        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
        },
        name: {
            type: String, // VD: "Sprint 1", "Sprint 2"
            required: true,
        },
        startDate: {
            type: Date
        },
        endDate: {
            type: Date
        },
        status: {
            type: String,
            enum: ["pending", "active", "completed"], // Chờ chạy, Đang chạy, Đã xong
            default: "pending",
        },
        goal: {
            type: String
        }
    },
    {
        timestamps: true,
        collection: "tblsprint"
    }
);

module.exports = mongoose.model("Sprint", sprintSchema);