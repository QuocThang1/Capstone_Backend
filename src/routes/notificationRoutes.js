const express = require("express");
const { getMyNotifications, deleteNotification } = require("../controllers/notificationController");
const auth = require("../middleware/auth");

const routerAPI = express.Router();

routerAPI.use(auth);

routerAPI.get("/", getMyNotifications);
routerAPI.delete("/:notificationId", deleteNotification);

module.exports = routerAPI;