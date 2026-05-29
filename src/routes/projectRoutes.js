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
    deleteIssueType
} = require("../controllers/projectController");
const auth = require("../middleware/auth");

const routerAPI = express.Router();

routerAPI.use(auth);

// Project General
routerAPI.post("/", createProject);
routerAPI.get("/", getAllProjects);
routerAPI.post("/respond-invite", respondToInvitation);
routerAPI.get("/:projectId", getProjectById);
routerAPI.put("/:projectId", updateProject);
routerAPI.delete("/:projectId", deleteProject);

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