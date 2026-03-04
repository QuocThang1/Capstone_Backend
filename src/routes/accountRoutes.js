const express = require("express");
const {
    handleSignUp,
} = require("../controllers/accountController");

const routerAPI = express.Router();

routerAPI.post("/register", handleSignUp);

module.exports = routerAPI;