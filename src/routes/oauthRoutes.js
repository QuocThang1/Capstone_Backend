const express = require("express");
const { handleGoogleCallback, handleGitHubCallback } = require("../controllers/oauthController");

const routerAPI = express.Router();

routerAPI.post("/google", handleGoogleCallback);
routerAPI.post("/github", handleGitHubCallback);

module.exports = routerAPI;
