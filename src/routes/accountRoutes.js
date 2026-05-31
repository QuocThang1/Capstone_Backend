const express = require("express");
const {
    handleSignUp,
    handleLogin,
    getAccount,
    updateProfile,
    sendOTP,
    verifyOTP,
    toggleStarProject,
    getStarredProjects,
    forgotPassword,
    changePassword
} = require("../controllers/accountController");
const auth = require("../middleware/auth");

const routerAPI = express.Router();

routerAPI.post("/register", handleSignUp);
routerAPI.post("/login", handleLogin);
routerAPI.get("/get-account", auth, getAccount);
routerAPI.put("/profile", auth, updateProfile);
routerAPI.post("/send-otp", sendOTP);
routerAPI.post("/verify-otp", verifyOTP);
routerAPI.post("/forgot-password", forgotPassword);
routerAPI.post("/change-password", auth, changePassword);
routerAPI.post("/toggle-star", auth, toggleStarProject);
routerAPI.get("/starred-projects", auth, getStarredProjects);


module.exports = routerAPI;