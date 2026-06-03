const express = require("express");
const { analyze, detect, report } = require("../controllers/intelligenceDetectController");
const auth = require("../middleware/auth");

const routerAPI = express.Router();

routerAPI.use(auth);

routerAPI.post("/analyze", analyze);
routerAPI.post("/detect", detect);
routerAPI.post("/report", report);

module.exports = routerAPI;
