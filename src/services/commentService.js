const commentDAO = require("../DAO/commentDAO");
const issueDAO = require("../DAO/issueDAO");
const projectDAO = require("../DAO/projectDAO");
const historyService = require("./historyService");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");

const createCommentService = async (req, commentData, authorId) => {
    const { issueId, content, parentId } = commentData;

    const issue = await issueDAO.getIssueById(issueId);
    if (!issue) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Issue not found.");
    }

    const hasAccess = await projectDAO.isMemberOfProject(issue.projectId, authorId);
    if (!hasAccess) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You are not a member of this project.");
    }

    // Nếu là reply, kiểm tra xem comment cha có tồn tại không
    if (parentId) {
        const parentComment = await commentDAO.getCommentById(parentId);
        if (!parentComment || parentComment.issueId.toString() !== issueId) {
            throw new ApiError(StatusCodes.NOT_FOUND, "Parent comment not found in this issue.");
        }
    }

    const newComment = await commentDAO.createComment({ issueId, content, parentId, authorId });
    const populatedComment = await newComment.populate('authorId', 'username fullName email');

    const io = req.app.get('io');
    // Phát sự kiện đến tất cả client trong phòng của issue này
    io.to(issueId).emit('new_comment', populatedComment);

    const shortContent = content.length > 50 ? content.substring(0, 50) + "..." : content;
    const historyActionName = parentId ? "Replied to a Comment" : "Added a Comment";

    await historyService.createHistoryRecord(
        issueId,
        authorId,
        historyActionName,
        null,
        `"${shortContent}"`,
        io
    );

    return populatedComment;
};

const getCommentsByIssueService = async (issueId, userId) => {
    const issue = await issueDAO.getIssueById(issueId);
    if (!issue) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Issue not found.");
    }

    const hasAccess = await projectDAO.isMemberOfProject(issue.projectId, userId);
    if (!hasAccess) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You are not a member of this project.");
    }

    const comments = await commentDAO.getCommentsByIssueId(issueId);
    // Lấy replies cho mỗi comment
    const commentsWithReplies = await Promise.all(comments.map(async (comment) => {
        const replies = await commentDAO.getReplies(comment._id);
        // Chuyển Mongoose document thành plain object để thêm thuộc tính mới
        const commentObj = comment.toObject();
        commentObj.replies = replies;
        return commentObj;
    }));

    return commentsWithReplies;
};

const updateCommentService = async (req, commentId, content, authorId) => {
    const comment = await commentDAO.getCommentById(commentId);
    if (!comment) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Comment not found.");
    }

    if (comment.authorId.toString() !== authorId.toString()) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You can only edit your own comments.");
    }

    const updatedComment = await commentDAO.updateComment(commentId, content);

    const io = req.app.get('io');
    io.to(updatedComment.issueId.toString()).emit('update_comment', updatedComment);

    return updatedComment;
};

const deleteCommentService = async (req, commentId, authorId) => {
    const comment = await commentDAO.getCommentById(commentId);
    if (!comment) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Comment not found.");
    }

    if (comment.authorId.toString() !== authorId.toString()) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You can only delete your own comments.");
    }

    await commentDAO.deleteComment(commentId);

    const io = req.app.get('io');
    io.to(comment.issueId.toString()).emit('delete_comment', { _id: comment._id, parentId: comment.parentId });

    return { message: "Comment deleted successfully." };
};

module.exports = {
    createCommentService,
    getCommentsByIssueService,
    updateCommentService,
    deleteCommentService,
};