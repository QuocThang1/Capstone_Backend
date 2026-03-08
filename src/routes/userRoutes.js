const express = require("express");
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    toggleUserStatus,
    deleteUser,
} = require("../controllers/userController");

const adminAuth = require("../middleware/adminAuth");

const routerAPI = express.Router();

routerAPI.use(adminAuth);

routerAPI.get("/", getAllUsers);
routerAPI.get("/:userId", getUserById);
routerAPI.post("/", createUser);
routerAPI.put("/:userId", updateUser);
routerAPI.patch("/:userId/toggle-status", toggleUserStatus);
routerAPI.delete("/:userId", deleteUser);

module.exports = routerAPI;