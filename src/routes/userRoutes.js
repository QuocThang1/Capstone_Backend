const express = require("express");
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    toggleUserStatus,
    deleteUser,
    uploadAvatar,
} = require("../controllers/userController");

const adminAuth = require("../middleware/adminAuth");
const { uploadCloud } = require("../config/cloudinary");

const routerAPI = express.Router();

routerAPI.use(adminAuth);

routerAPI.get("/", getAllUsers);
routerAPI.get("/:userId", getUserById);
routerAPI.post("/", createUser);
routerAPI.put("/:userId", updateUser);
routerAPI.post("/:userId/upload-avatar", uploadCloud.single('avatar'), uploadAvatar);
routerAPI.patch("/:userId/toggle-status", toggleUserStatus);
routerAPI.delete("/:userId", deleteUser);

module.exports = routerAPI;