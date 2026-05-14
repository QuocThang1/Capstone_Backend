const express = require("express");
const { getAllBottlenecks, getMyBottlenecks, getBottlenecksByIssue, getBottlenecksByProject } = require("../controllers/bottleneckController");
const auth = require("../middleware/auth");

const routerAPI = express.Router();

routerAPI.use(auth);

routerAPI.get("/", getAllBottlenecks);
routerAPI.get("/my-bottlenecks", getMyBottlenecks);
routerAPI.get("/issue/:issueId", getBottlenecksByIssue);
routerAPI.get("/project/:projectId", getBottlenecksByProject);

module.exports = routerAPI;