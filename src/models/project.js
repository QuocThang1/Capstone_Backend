const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        key: {
            type: String,
            required: true,
            uppercase: true, // VD: "HRM"
        },
        description: {
            type: String,
            required: false,
        },
        // Phân quyền thành viên cấp dự án
        members: [
            {
                accountId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Account",
                    required: true,
                },
                role: {
                    type: String,
                    enum: ["leader", "member", "viewer"],
                    default: "member",
                },
            }
        ],
        // Tùy biến cột trạng thái Kanban
        boardColumns: [
            {
                name: { type: String, required: true }, // VD: "To Do", "In Progress"
                order: { type: Number, required: true }
            }
        ],
        // Tùy biến loại thẻ (Issue Types) cho dự án này
        issueTypes: [
            {
                name: { type: String, required: true }, // VD: "Task", "Bug", "Story"
                description: { type: String },
                iconUrl: { type: String }
            }
        ],

        activeWorkflowId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Workflow",
            required: false,
        },
        notificationCron: {
            type: String,
            default: '0 8 * * *'
        },
        bottleneckCron: {
            type: String,
            default: '0 * * * *'
        },
        isNotificationActive: { type: Boolean, default: true },
        isBottleneckActive: { type: Boolean, default: true },

        timezone: {
            type: String,
            default: 'UTC'
        },

        issueSequence: {
            type: Number,
            default: 0,
        },
        isAiDraft: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        collection: "tblproject",
    }
);

module.exports = mongoose.model("Project", projectSchema);