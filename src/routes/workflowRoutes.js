const express = require("express");
const {
    getWorkflowsByProject,
    createWorkflow,
    getWorkflowById,
    updateWorkflow,
    deleteWorkflow,
    applyWorkflow,
} = require("../controllers/workflowController");
const auth = require("../middleware/auth");

const routerAPI = express.Router();
routerAPI.use(auth);

routerAPI.get("/project/:projectId", getWorkflowsByProject);

routerAPI.post("/project/:projectId/apply", applyWorkflow);

routerAPI.post("/project/:projectId", createWorkflow);

routerAPI.get("/:workflowId", getWorkflowById);
routerAPI.put("/:workflowId", updateWorkflow);
routerAPI.delete("/:workflowId", deleteWorkflow);

module.exports = routerAPI;