const express = require("express");
const { getHistoryByIssue } = require("../controllers/historyController");
const auth = require("../middleware/auth");

const routerAPI = express.Router();
routerAPI.use(auth);

routerAPI.get("/issue/:issueId", getHistoryByIssue);

module.exports = routerAPI;