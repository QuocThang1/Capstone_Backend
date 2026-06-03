const express = require("express");
const { getAllBottlenecks, getMyBottlenecks, getBottlenecksByIssue, getBottlenecksByProject, requestResolveBottleneck, approveBottleneck, getUnresolvedBottleneckCountByUser } = require("../controllers/bottleneckController");
const auth = require("../middleware/auth");

const routerAPI = express.Router();

routerAPI.use(auth);

routerAPI.get("/", getAllBottlenecks);
routerAPI.get("/my-bottlenecks", getMyBottlenecks);
routerAPI.get("/my/unresolved-count", getUnresolvedBottleneckCountByUser);
routerAPI.get("/issue/:issueId", getBottlenecksByIssue);
routerAPI.get("/project/:projectId", getBottlenecksByProject);
routerAPI.put("/:id/request-resolve", requestResolveBottleneck);
routerAPI.put("/:id/approve-resolve", approveBottleneck);
module.exports = routerAPI;