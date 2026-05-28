const express = require("express");
const { createIssue,
    getIssuesBySprint,
    getIssuesByProject,
    getMyIssuesByProject,
    getMyIssues,
    updateIssue,
    deleteIssue,
    createSubtask,
    getSubtasks,
    suggestAssignees
} = require("../controllers/issueController");
const { uploadCloud } = require("../config/cloudinary");
const { uploadAttachment, deleteAttachment } = require("../controllers/issueController");
const auth = require("../middleware/auth");

const routerAPI = express.Router();

routerAPI.use(auth);

routerAPI.post("/subtask", createSubtask);
routerAPI.post("/", createIssue);
routerAPI.get("/my/all", getMyIssues);
routerAPI.get("/my/project/:projectId", getMyIssuesByProject);
routerAPI.get("/sprint/:sprintId", getIssuesBySprint);
routerAPI.get("/project/:projectId", getIssuesByProject);
routerAPI.get("/:issueId/subtasks", getSubtasks);
routerAPI.get("/:issueId/suggest-assignees", suggestAssignees);
routerAPI.put("/:issueId", updateIssue);
routerAPI.delete("/:issueId", deleteIssue);
routerAPI.post("/:issueId/attachments", uploadCloud.single('file'), uploadAttachment);
routerAPI.delete("/:issueId/attachments/:attachmentId", deleteAttachment);
module.exports = routerAPI;