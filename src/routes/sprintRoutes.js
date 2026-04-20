const express = require("express");
const {
    createSprint,
    getSprintsByProject,
    updateSprint,
    deleteSprint,
} = require("../controllers/sprintController");
const auth = require("../middleware/auth");

const routerAPI = express.Router();

routerAPI.use(auth);

routerAPI.post("/project/:projectId", createSprint);
routerAPI.get("/project/:projectId", getSprintsByProject);
routerAPI.put("/:sprintId", updateSprint);
routerAPI.delete("/:sprintId", deleteSprint);

module.exports = routerAPI;