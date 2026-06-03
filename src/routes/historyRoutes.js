const express = require("express");
const { getHistoryByIssue, getHistoryByProject } = require("../controllers/historyController");
const auth = require("../middleware/auth");

const routerAPI = express.Router();
routerAPI.use(auth);

routerAPI.get("/issue/:issueId", getHistoryByIssue);
routerAPI.get("/project/:projectId", getHistoryByProject);

module.exports = routerAPI;