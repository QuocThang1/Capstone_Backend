const express = require("express");
const {
    handleSignUp,
    handleLogin,
    getAccount,
    updateProfile,
} = require("../controllers/accountController");
const auth = require("../middleware/auth");

const routerAPI = express.Router();

routerAPI.post("/register", handleSignUp);
routerAPI.post("/login", handleLogin);
routerAPI.get("/get-account", auth, getAccount);
routerAPI.put("/profile", auth, updateProfile);


module.exports = routerAPI;