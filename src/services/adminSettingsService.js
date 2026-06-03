const { StatusCodes } = require("http-status-codes");
const ApiError = require("../utils/ApiError");
const SystemSettings = require("../models/systemSettings");
const { sendSystemMail } = require("../utils/mailer");
const { EMAIL_TEMPLATE_KEYS } = require("../utils/emailTemplates");
const { renderEmailTemplate } = require("./emailTemplateService");

const defaultSettings = {
  key: "platform",
  platformName: "TASKA",
  supportEmail: "nextgen1811.hrms@gmail.com",
  defaultLanguage: "English",
  defaultTimezone: "Asia/Ho_Chi_Minh",
  allowPublicSignups: true,
  requireEmailVerification: true,
  allowThirdPartyLogin: false,
  allowPasswordLogin: true,
  emailProvider: "Gmail SMTP",
  senderName: "TASKA",
  senderEmail: "nextgen1811.hrms@gmail.com",
  enableEmailNotifications: true,
  enableOtpEmail: true,
  enablePasswordResetEmail: true,
  enableInviteMemberEmail: true,
  enableAuditLogging: true,
  maxLoginAttempts: 5,
  lockAccountDurationMinutes: 15,
  sessionTimeoutMinutes: 60,
  requireStrongPassword: true,
  enableBottleneckDetection: true,
  warningThresholdHours: 24,
  criticalThresholdHours: 48,
  autoDetectSchedule: "Every 6 hours",
  enableBottleneckNotification: true,
  enableReportGeneration: true,
  maintenanceMode: false,
  maintenanceMessage:
    "TASKA is currently under maintenance. Please try again later.",
  allowAdminAccessDuringMaintenance: true,
};

const editableFields = Object.keys(defaultSettings).filter(
  (field) => field !== "key",
);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeSettings = (settings) => {
  const result = {};
  editableFields.forEach((field) => {
    if (field === "allowThirdPartyLogin" && settings[field] === undefined) {
      result[field] = settings.allowGoogleLogin ?? defaultSettings[field];
      return;
    }
    result[field] =
      settings[field] === undefined ? defaultSettings[field] : settings[field];
  });
  return result;
};

const getOrCreateSystemSettings = async () => {
  return SystemSettings.findOneAndUpdate(
    { key: "platform" },
    { $setOnInsert: defaultSettings },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
  );
};

const validateSettings = (settings) => {
  if (!settings.platformName?.trim())
    throw new ApiError(StatusCodes.BAD_REQUEST, "Platform name is required");
  if (!emailPattern.test(settings.supportEmail || ""))
    throw new ApiError(StatusCodes.BAD_REQUEST, "Support email is invalid");
  if (!emailPattern.test(settings.senderEmail || ""))
    throw new ApiError(StatusCodes.BAD_REQUEST, "Sender email is invalid");
  if (!settings.allowPasswordLogin && !settings.allowThirdPartyLogin) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "At least one login method must remain enabled",
    );
  }
  if (settings.maxLoginAttempts < 1 || settings.maxLoginAttempts > 20) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Max login attempts must be between 1 and 20",
    );
  }
  if (
    settings.lockAccountDurationMinutes < 1 ||
    settings.lockAccountDurationMinutes > 1440
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Lock duration must be between 1 and 1440 minutes",
    );
  }
  if (
    settings.sessionTimeoutMinutes < 5 ||
    settings.sessionTimeoutMinutes > 1440
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Session timeout must be between 5 and 1440 minutes",
    );
  }
  if (settings.warningThresholdHours < 1) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Warning threshold must be at least 1 hour",
    );
  }
  if (settings.criticalThresholdHours < settings.warningThresholdHours) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Critical threshold must be greater than or equal to warning threshold",
    );
  }
};

const getSystemSettingsService = async () =>
  normalizeSettings(await getOrCreateSystemSettings());

const getPublicAuthSettingsService = async () => {
  const settings = await getOrCreateSystemSettings();
  return {
    allowPublicSignups: settings.allowPublicSignups,
    allowPasswordLogin: settings.allowPasswordLogin,
    allowThirdPartyLogin:
      settings.allowThirdPartyLogin ?? settings.allowGoogleLogin ?? false,
  };
};

const updateSystemSettingsService = async (data, updatedBy) => {
  const existing = await getOrCreateSystemSettings();
  const updateData = {};
  editableFields.forEach((field) => {
    updateData[field] =
      data[field] === undefined
        ? field === "allowThirdPartyLogin" && existing[field] === undefined
          ? (existing.allowGoogleLogin ?? defaultSettings[field])
          : existing[field] === undefined
            ? defaultSettings[field]
            : existing[field]
        : data[field];
  });
  validateSettings(updateData);

  const settings = await SystemSettings.findOneAndUpdate(
    { key: "platform" },
    { $set: { ...updateData, updatedBy } },
    { returnDocument: "after", upsert: true, runValidators: true },
  );
  return normalizeSettings(settings);
};

const resetSystemSettingsService = async (updatedBy) => {
  const settings = await SystemSettings.findOneAndUpdate(
    { key: "platform" },
    { $set: { ...defaultSettings, updatedBy } },
    { returnDocument: "after", upsert: true, runValidators: true },
  );
  return normalizeSettings(settings);
};

const sendSystemTestEmail = async ({ to, subject, message }) => {
  const settings = await getOrCreateSystemSettings();
  if (!settings.enableEmailNotifications) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Email notifications are disabled",
    );
  }
  const recipient = to || settings.supportEmail;
  if (!emailPattern.test(recipient || ""))
    throw new ApiError(StatusCodes.BAD_REQUEST, "Recipient email is invalid");

  try {
    const testEmail = await renderEmailTemplate(
      EMAIL_TEMPLATE_KEYS.SYSTEM_TEST,
      {
        message: message || "This is a test email from TASKA system settings.",
      },
    );
    await sendSystemMail({
      to: recipient,
      ...testEmail,
      subject: subject || testEmail.subject,
      from: `${settings.senderName} <${settings.senderEmail}>`,
    });
  } catch (error) {
    throw new ApiError(
      StatusCodes.BAD_GATEWAY,
      `Unable to send test email: ${error.message}`,
    );
  }
};

module.exports = {
  defaultSettings,
  getOrCreateSystemSettings,
  getSystemSettingsService,
  getPublicAuthSettingsService,
  updateSystemSettingsService,
  resetSystemSettingsService,
  sendSystemTestEmail,
};
