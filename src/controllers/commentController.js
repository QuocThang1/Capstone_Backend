const {
    createCommentService,
    getCommentsByIssueService,
    updateCommentService,
    deleteCommentService,
} = require("../services/commentService");
const { StatusCodes } = require("http-status-codes");

const createComment = async (req, res, next) => {
    try {
        const authorId = req.user._id;
        const commentData = req.body;
        const comment = await createCommentService(req, commentData, authorId);
        res.status(StatusCodes.CREATED).json({ EC: 0, EM: "Comment created.", data: comment });
    } catch (error) {
        next(error);
    }
};

const getCommentsByIssue = async (req, res, next) => {
    try {
        const { issueId } = req.params;
        const userId = req.user._id;
        const comments = await getCommentsByIssueService(issueId, userId);
        res.status(StatusCodes.OK).json({ EC: 0, EM: "Success.", data: comments });
    } catch (error) {
        next(error);
    }
};

const updateComment = async (req, res, next) => {
    try {
        const { commentId } = req.params;
        const { content } = req.body;
        const authorId = req.user._id;
        const updatedComment = await updateCommentService(req, commentId, content, authorId);
        res.status(StatusCodes.OK).json({ EC: 0, EM: "Comment updated.", data: updatedComment });
    } catch (error) {
        next(error);
    }
};

const deleteComment = async (req, res, next) => {
    try {
        const { commentId } = req.params;
        const authorId = req.user._id;
        const result = await deleteCommentService(req, commentId, authorId);
        res.status(StatusCodes.OK).json({ EC: 0, EM: result.message, data: null });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createComment,
    getCommentsByIssue,
    updateComment,
    deleteComment,
};