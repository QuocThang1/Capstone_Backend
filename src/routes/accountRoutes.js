const express = require("express");
const {
    handleSignUp,
    handleLogin,
    getAccount,
    updateProfile,
    sendOTP,
    verifyOTP,
} = require("../controllers/accountController");
const auth = require("../middleware/auth");

const routerAPI = express.Router();

routerAPI.post("/register", handleSignUp);
routerAPI.post("/login", handleLogin);
routerAPI.get("/get-account", auth, getAccount);
routerAPI.put("/profile", auth, updateProfile);
routerAPI.post("/send-otp", sendOTP);
routerAPI.post("/verify-otp", verifyOTP);


module.exports = routerAPI;