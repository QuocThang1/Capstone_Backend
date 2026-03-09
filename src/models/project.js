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
            unique: true,
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
        issueSequence: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
        collection: "tblproject",
    }
);

module.exports = mongoose.model("Project", projectSchema);