const express = require("express");
const { getPublicAuthSettings } = require("../controllers/adminSettingsController");

const routerAPI = express.Router();

routerAPI.get("/public-auth", getPublicAuthSettings);

module.exports = routerAPI;
