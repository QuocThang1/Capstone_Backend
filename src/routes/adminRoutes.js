const express = require("express");
const adminAuth = require("../middleware/adminAuth");
const { getPlatformDashboard } = require("../controllers/adminDashboardController");
const {
    getAllOrganizations,
    getOrganizationById,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    toggleOrganizationStatus,
} = require("../controllers/adminOrganizationController");
const {
    getSystemSettings,
    updateSystemSettings,
    resetSystemSettings,
    sendTestEmail,
} = require("../controllers/adminSettingsController");
const {
    getAllAuditLogs,
    getAuditLogById,
} = require("../controllers/adminAuditLogController");

const routerAPI = express.Router();

routerAPI.use(adminAuth);

routerAPI.get("/dashboard", getPlatformDashboard);
routerAPI.get("/organizations", getAllOrganizations);
routerAPI.get("/organizations/:orgId", getOrganizationById);
routerAPI.post("/organizations", createOrganization);
routerAPI.put("/organizations/:orgId", updateOrganization);
routerAPI.delete("/organizations/:orgId", deleteOrganization);
routerAPI.patch("/organizations/:orgId/toggle-status", toggleOrganizationStatus);
routerAPI.get("/settings", getSystemSettings);
routerAPI.put("/settings", updateSystemSettings);
routerAPI.post("/settings/reset", resetSystemSettings);
routerAPI.get("/system-settings", getSystemSettings);
routerAPI.put("/system-settings", updateSystemSettings);
routerAPI.post("/system-settings/test-email", sendTestEmail);
routerAPI.get("/audit-logs", getAllAuditLogs);
routerAPI.get("/audit-logs/:logId", getAuditLogById);

module.exports = routerAPI;
