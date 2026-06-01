const { StatusCodes } = require("http-status-codes");
const {
    createGlobalNotificationService,
    getAllGlobalNotificationsService,
    deleteGlobalNotificationService,
    getAdminMessageTemplatesService,
} = require("../services/adminNotificationService");
const { createAuditLog } = require("../services/adminAuditLogService");

const writeAuditLog = (req, data) => createAuditLog(req, {
    actorId: req.user?._id,
    actor: req.user?.fullName || req.user?.email || "Admin",
    ...data,
}).catch((error) => console.error("Unable to write audit log:", error.message));

const createGlobalNotification = async (req, res, next) => {
    try {
        const notification = await createGlobalNotificationService(req.body, req.user._id, req.app.get("io"));
        await writeAuditLog(req, {
            action: "Global notification sent",
            target: notification.target,
            severity: notification.type === "Critical" ? "Critical" : notification.type === "Warning" ? "Warning" : "Info",
            details: `Sent "${notification.title}" through ${notification.channels.join(", ")}.`,
        });
        return res.status(StatusCodes.CREATED).json({ EC: 0, EM: "Notification sent successfully", data: notification });
    } catch (error) {
        next(error);
    }
};

const getAllGlobalNotifications = async (req, res, next) => {
    try {
        return res.status(StatusCodes.OK).json({ EC: 0, EM: "Success", data: await getAllGlobalNotificationsService() });
    } catch (error) {
        next(error);
    }
};

const deleteGlobalNotification = async (req, res, next) => {
    try {
        const result = await deleteGlobalNotificationService(req.params.notifId);
        return res.status(StatusCodes.OK).json({ EC: 0, EM: result.message, data: null });
    } catch (error) {
        next(error);
    }
};

const getAdminMessageTemplates = async (req, res, next) => {
    try {
        return res.status(StatusCodes.OK).json({ EC: 0, EM: "Success", data: await getAdminMessageTemplatesService() });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createGlobalNotification,
    getAllGlobalNotifications,
    deleteGlobalNotification,
    getAdminMessageTemplates,
};
