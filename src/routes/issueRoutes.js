const express = require("express");
const { createIssue,
    getIssuesBySprint,
    getIssuesByProject,
    updateIssue,
    deleteIssue,
    createSubtask,
    getSubtasks
} = require("../controllers/issueController");
const auth = require("../middleware/auth");

const routerAPI = express.Router();

routerAPI.use(auth);

routerAPI.post("/subtask", createSubtask);
routerAPI.post("/", createIssue);
routerAPI.get("/sprint/:sprintId", getIssuesBySprint);
routerAPI.get("/project/:projectId", getIssuesByProject);
routerAPI.get("/:issueId/subtasks", getSubtasks);
routerAPI.put("/:issueId", updateIssue);
routerAPI.delete("/:issueId", deleteIssue);

module.exports = routerAPI;