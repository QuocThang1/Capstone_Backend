const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
    {
        issueId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Issue",
            required: true,
        },
        authorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment",
            default: null,
        },
    },
    {
        timestamps: true,
        collection: "tblcomment",
    }
);

// Tạo Index để tăng tốc độ truy vấn khi một Task có quá nhiều Comment
// 1 là xếp tăng dần, -1 là giảm dần (để ưu tiên lấy comment mới nhất)
commentSchema.index({ issueId: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);