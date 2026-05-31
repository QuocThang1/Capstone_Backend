const mongoose = require("mongoose");

const systemSettingsSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            default: "platform",
            unique: true,
        },
        platformName: { type: String, default: "TASKA", trim: true },
        supportEmail: { type: String, default: "nextgen1811.hrms@gmail.com", trim: true, lowercase: true },
        defaultLanguage: { type: String, default: "English" },
        defaultTimezone: { type: String, default: "Asia/Ho_Chi_Minh" },

        allowPublicSignups: { type: Boolean, default: true },
        requireEmailVerification: { type: Boolean, default: true },
        allowThirdPartyLogin: { type: Boolean },
        // Kept temporarily so existing settings documents can migrate cleanly.
        allowGoogleLogin: { type: Boolean },
        allowPasswordLogin: { type: Boolean, default: true },

        emailProvider: { type: String, default: "Gmail SMTP" },
        senderName: { type: String, default: "TASKA", trim: true },
        senderEmail: { type: String, default: "nextgen1811.hrms@gmail.com", trim: true, lowercase: true },
        enableEmailNotifications: { type: Boolean, default: true },
        enableOtpEmail: { type: Boolean, default: true },
        enablePasswordResetEmail: { type: Boolean, default: true },
        enableInviteMemberEmail: { type: Boolean, default: true },

        enableAuditLogging: { type: Boolean, default: true },
        maxLoginAttempts: { type: Number, default: 5 },
        lockAccountDurationMinutes: { type: Number, default: 15 },
        sessionTimeoutMinutes: { type: Number, default: 60 },
        requireStrongPassword: { type: Boolean, default: true },

        enableBottleneckDetection: { type: Boolean, default: true },
        warningThresholdHours: { type: Number, default: 24 },
        criticalThresholdHours: { type: Number, default: 48 },
        autoDetectSchedule: { type: String, default: "Every 6 hours" },
        enableBottleneckNotification: { type: Boolean, default: true },
        enableReportGeneration: { type: Boolean, default: true },

        maintenanceMode: { type: Boolean, default: false },
        maintenanceMessage: {
            type: String,
            default: "TASKA is currently under maintenance. Please try again later.",
        },
        allowAdminAccessDuringMaintenance: { type: Boolean, default: true },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            default: null,
        },
    },
    {
        timestamps: true,
        collection: "tblsystemsettings",
    }
);

module.exports = mongoose.model("SystemSettings", systemSettingsSchema);
