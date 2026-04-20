const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema(
    {
        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
        },
        sprintId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Sprint",
        },
        issueKey: {
            type: String,
            required: true,
            unique: true, // VD: "HRM-12"
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: false,
        },
        type: {
            type: String,
            required: true, // Lưu tên loại thẻ (VD: "Bug", "Task" - khớp với issueTypes bên Project)
        },
        priority: {
            type: String,
            enum: ["Highest", "High", "Medium", "Low", "Lowest"],
            default: "Medium",
        },
        storyPoints: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            default: "To Do", // Lưu tên cột Kanban
        },
        reporterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            required: true, // Người tạo
        },
        assigneeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            default: null, // Người được giao xử lý
        },
        dueDate: {
            type: Date,
            required: false,
        },
        startDate: {
            type: Date,
            default: null,
        },
        completedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: "tblissue",
    }
);

// Tối ưu hóa tốc độ truy vấn cho các tính năng lọc
issueSchema.index({ projectId: 1, sprintId: 1 });
issueSchema.index({ projectId: 1, status: 1 });

module.exports = mongoose.model("Issue", issueSchema);