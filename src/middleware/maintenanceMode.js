const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");
const ApiError = require("../utils/ApiError");
const { getOrCreateSystemSettings } = require("../services/adminSettingsService");
const { env } = require("../config/env");

const maintenanceMode = async (req, res, next) => {
    try {
        const publicPaths = [
            "/v1/api/account/login",
            "/v1/api/auth/google",
            "/v1/api/auth/github",
            "/v1/api/system-settings/public-auth",
        ];
        if (publicPaths.includes(req.path)) return next();

        const settings = await getOrCreateSystemSettings();
        if (!settings.maintenanceMode) return next();

        const authorization = req.headers.authorization;
        if (settings.allowAdminAccessDuringMaintenance && authorization) {
            const token = authorization.split(" ")[1];
            try {
                const decoded = jwt.verify(token, env.jwt.secret);
                if (decoded.role === "admin") return next();
            } catch {
                // Let maintenance response handle invalid or expired tokens.
            }
        }

        throw new ApiError(
            StatusCodes.SERVICE_UNAVAILABLE,
            settings.maintenanceMessage || "TASKA is currently under maintenance. Please try again later."
        );
    } catch (error) {
        next(error);
    }
};

module.exports = maintenanceMode;
