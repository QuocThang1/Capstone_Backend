const express = require("express");
const {
    createProject,
    getAllProjects,
    getProjectById,
    updateProject,
    deleteProject,
    addMember,
    respondToInvitation,
    removeMember,
    updateBoardColumns,
    updateIssueTypes,
    getProjectMembers,
    getBoardColumns,
    getIssueTypes,
    deleteBoardColumn,
    deleteIssueType,
    createSmartProject,
    confirmSmartProject
} = require("../controllers/projectController");
const { getBurndownChart, getIssueTypeChart, getWorkloadChart, getVelocityChart } = require("../controllers/chartController");
const auth = require("../middleware/auth");

const routerAPI = express.Router();

routerAPI.use(auth);

routerAPI.post("/ai/create", createSmartProject);
routerAPI.put("/:projectId/ai-confirm", confirmSmartProject);

// Project General
routerAPI.post("/", createProject);
routerAPI.get("/", getAllProjects);
routerAPI.post("/respond-invite", respondToInvitation);
routerAPI.get("/:projectId", getProjectById);
routerAPI.put("/:projectId", updateProject);
routerAPI.delete("/:projectId", deleteProject);

// Charts
routerAPI.get("/:projectId/charts/burndown", getBurndownChart);
routerAPI.get("/:projectId/charts/issue-type", getIssueTypeChart);
routerAPI.get("/:projectId/charts/workload", getWorkloadChart);
routerAPI.get("/:projectId/charts/velocity", getVelocityChart);

// Project Members
routerAPI.post("/:projectId/members", addMember);
routerAPI.get("/:projectId/members", getProjectMembers);
routerAPI.delete("/:projectId/members/:accountId", removeMember);

// Project Board Columns
routerAPI.get("/:projectId/board-columns", getBoardColumns);
routerAPI.put("/:projectId/board-columns", updateBoardColumns);
routerAPI.delete("/:projectId/board-columns/:columnName", deleteBoardColumn);

// Project Issue Types
routerAPI.get("/:projectId/issue-types", getIssueTypes);
routerAPI.put("/:projectId/issue-types", updateIssueTypes);
routerAPI.delete("/:projectId/issue-types/:typeName", deleteIssueType);

module.exports = routerAPI;
