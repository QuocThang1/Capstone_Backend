const express = require("express");
const { createIssue,
    getIssuesBySprint,
    getIssuesByProject
} = require("../controllers/issueController");
const auth = require("../middleware/auth");

const routerAPI = express.Router();

routerAPI.use(auth);

routerAPI.post("/", createIssue);
routerAPI.get("/sprint/:sprintId", getIssuesBySprint);
routerAPI.get("/project/:projectId", getIssuesByProject);

module.exports = routerAPI;