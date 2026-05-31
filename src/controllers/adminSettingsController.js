const { StatusCodes } = require("http-status-codes");
const {
    getSystemSettingsService,
    getPublicAuthSettingsService,
    updateSystemSettingsService,
    resetSystemSettingsService,
    sendSystemTestEmail,
} = require("../services/adminSettingsService");
const { createAuditLog } = require("../services/adminAuditLogService");

const writeAuditLog = (req, data) => createAuditLog(req, {
    actorId: req.user?._id,
    actor: req.user?.fullName || req.user?.email || "Admin",
    ...data,
}).catch((error) => console.error("Unable to write audit log:", error.message));

const getSystemSettings = async (req, res, next) => {
    try {
        const settings = await getSystemSettingsService();
        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Success",
            data: settings,
        });
    } catch (error) {
        next(error);
    }
};

const getPublicAuthSettings = async (req, res, next) => {
    try {
        const settings = await getPublicAuthSettingsService();
        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Success",
            data: settings,
        });
    } catch (error) {
        next(error);
    }
};

const updateSystemSettings = async (req, res, next) => {
    try {
        const settings = await updateSystemSettingsService(req.body, req.user._id);
        await writeAuditLog(req, {
            action: "System settings updated",
            target: "Platform settings",
            severity: settings.maintenanceMode ? "Warning" : "Info",
            details: settings.maintenanceMode
                ? "Updated platform settings and enabled maintenance mode."
                : "Updated platform settings.",
        });
        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Settings updated successfully",
            data: settings,
        });
    } catch (error) {
        next(error);
    }
};

const resetSystemSettings = async (req, res, next) => {
    try {
        const settings = await resetSystemSettingsService(req.user._id);
        await writeAuditLog(req, {
            action: "System settings reset",
            target: "Platform settings",
            severity: "Warning",
            details: "Reset platform settings to their default values.",
        });
        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Settings reset successfully",
            data: settings,
        });
    } catch (error) {
        next(error);
    }
};

const sendTestEmail = async (req, res, next) => {
    try {
        await sendSystemTestEmail(req.body);
        await writeAuditLog(req, {
            action: "Test email sent",
            target: req.body.to || "Support email",
            details: "Sent a test email from System Settings.",
        });
        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Test email sent successfully",
            data: null,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSystemSettings,
    getPublicAuthSettings,
    updateSystemSettings,
    resetSystemSettings,
    sendTestEmail,
};
