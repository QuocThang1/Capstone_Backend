const Comment = require("../models/comment");

class CommentDAO {
    async createComment(commentData) {
        const newComment = new Comment(commentData);
        return await newComment.save();
    }

    async getCommentById(commentId) {
        return await Comment.findById(commentId);
    }

    async getCommentsByIssueId(issueId) {
        return await Comment.find({ issueId, parentId: null })
            .populate('authorId', 'username fullName email')
            .sort({ createdAt: 'desc' });
    }

    async getReplies(commentId) {
        return await Comment.find({ parentId: commentId })
            .populate('authorId', 'username fullName email')
            .sort({ createdAt: 'asc' });
    }

    async updateComment(commentId, content) {
        return await Comment.findByIdAndUpdate(
            commentId,
            { $set: { content } },
            { returnDocument: 'after' }
        ).populate('authorId', 'username fullName email');
    }

    async deleteComment(commentId) {
        // Khi xóa comment cha, cũng xóa tất cả các comment con (replies)
        await Comment.deleteMany({ parentId: commentId });
        return await Comment.findByIdAndDelete(commentId);
    }

    async deleteManyComments(filter) {
        return await Comment.deleteMany(filter);
    }
}

module.exports = new CommentDAO();
