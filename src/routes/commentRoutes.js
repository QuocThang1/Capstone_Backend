const express = require("express");
const {
    createComment,
    getCommentsByIssue,
    updateComment,
    deleteComment,
} = require("../controllers/commentController");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

router.post("/", createComment);
router.get("/issue/:issueId", getCommentsByIssue);
router.put("/:commentId", updateComment);
router.delete("/:commentId", deleteComment);

module.exports = router;