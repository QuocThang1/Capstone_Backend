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
const {
    getDataSecurity,
    getAllDataRequests,
    getDataRequestById,
    approveDataRequest,
    rejectDataRequest,
} = require("../controllers/adminSecurityController");
const {
    createGlobalNotification,
    getAllGlobalNotifications,
    deleteGlobalNotification,
    getAdminMessageTemplates,
} = require("../controllers/adminNotificationController");
const { getSystemHealth } = require("../controllers/adminSystemHealthController");
const {
    assignSupportTicket,
    closeSupportTicket,
    createSupportTicket,
    getAllSupportTickets,
    getSupportTicketById,
    runSupportDiagnostic,
    updateSupportTicket,
} = require("../controllers/adminSupportController");

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
routerAPI.get("/security", getDataSecurity);
routerAPI.get("/data-requests", getAllDataRequests);
routerAPI.get("/data-requests/:requestId", getDataRequestById);
routerAPI.patch("/data-requests/:requestId/approve", approveDataRequest);
routerAPI.patch("/data-requests/:requestId/reject", rejectDataRequest);
routerAPI.get("/message-templates", getAdminMessageTemplates);
routerAPI.post("/notifications/global", createGlobalNotification);
routerAPI.get("/notifications/global", getAllGlobalNotifications);
routerAPI.delete("/notifications/global/:notifId", deleteGlobalNotification);
routerAPI.get("/system/health", getSystemHealth);
routerAPI.post("/system/health-check", getSystemHealth);
routerAPI.get("/system/metrics", getSystemHealth);
routerAPI.get("/support-tickets", getAllSupportTickets);
routerAPI.post("/support-tickets", createSupportTicket);
routerAPI.get("/support-tickets/:ticketId", getSupportTicketById);
routerAPI.put("/support-tickets/:ticketId", updateSupportTicket);
routerAPI.patch("/support-tickets/:ticketId/close", closeSupportTicket);
routerAPI.patch("/support-tickets/:ticketId/assign", assignSupportTicket);
routerAPI.post("/support/diagnostics/:diagnostic", runSupportDiagnostic);

module.exports = routerAPI;
