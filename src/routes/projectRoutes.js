const express = require("express");
const {
    createProject,
    getAllProjects,
    getProjectById,
    updateProject,
    deleteProject,
} = require("../controllers/projectController");
const auth = require("../middleware/auth");

const routerAPI = express.Router();

routerAPI.use(auth);

routerAPI.post("/", createProject);
routerAPI.get("/", getAllProjects);
routerAPI.get("/:projectId", getProjectById);
routerAPI.put("/:projectId", updateProject);
routerAPI.delete("/:projectId", deleteProject);

module.exports = routerAPI;