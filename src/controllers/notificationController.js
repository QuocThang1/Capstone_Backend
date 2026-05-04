const { getMyNotificationsService, deleteNotificationService } = require("../services/notificationService");
const { StatusCodes } = require("http-status-codes");

const getMyNotifications = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const notifications = await getMyNotificationsService(userId);
        return res.status(StatusCodes.OK).json({ EC: 0, EM: "Success", data: notifications });
    } catch (error) {
        next(error);
    }
};

const deleteNotification = async (req, res, next) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user._id;

        const result = await deleteNotificationService(notificationId, userId);
        return res.status(StatusCodes.OK).json({ EC: 0, EM: result.message, data: null });
    } catch (error) {
        next(error);
    }
};

module.exports = { getMyNotifications, deleteNotification };