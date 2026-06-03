const express = require("express");
const {
    createSprint,
    getSprintsByProject,
    updateSprint,
    deleteSprint,
    startSprint,
    completeSprint,
    getOccupiedSprintRanges
} = require("../controllers/sprintController");
const auth = require("../middleware/auth");

const routerAPI = express.Router();

routerAPI.use(auth);


routerAPI.get("/project/:projectId/occupied-ranges", getOccupiedSprintRanges);
routerAPI.post("/project/:projectId", createSprint);
routerAPI.get("/project/:projectId", getSprintsByProject);
routerAPI.put("/:sprintId", updateSprint);
routerAPI.delete("/:sprintId", deleteSprint);
routerAPI.post("/:sprintId/start", startSprint);
routerAPI.post("/:sprintId/complete", completeSprint);

module.exports = routerAPI;