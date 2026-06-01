const { StatusCodes } = require("http-status-codes");
const ApiError = require("../utils/ApiError");
const Account = require("../models/account");
const EmailTemplate = require("../models/emailTemplate");
const GlobalNotification = require("../models/globalNotification");
const GlobalInboxNotification = require("../models/globalInboxNotification");
const MessageTemplate = require("../models/messageTemplate");
const { defaultMessageTemplates } = require("../utils/messageTemplates");
const { getOrCreateSystemSettings } = require("./adminSettingsService");
const { sendSystemMail } = require("../utils/mailer");

const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const normalizeGlobalNotification = (notification) => ({
    id: notification._id.toString(),
    title: notification.title,
    message: notification.message,
    type: notification.type,
    target: notification.target,
    channels: notification.channels,
    status: notification.status,
    recipientCount: notification.recipientCount,
    emailSentCount: notification.emailSentCount,
    emailFailedCount: notification.emailFailedCount,
    sentAt: notification.sentAt,
    createdAt: notification.createdAt,
});

const normalizeTemplate = (template, category) => ({
    id: template._id.toString(),
    key: template.key,
    name: template.name,
    category,
    title: template.title || template.subject,
    message: template.message || template.text,
    type: template.type || "Info",
    channels: template.channels || ["Email"],
    active: template.active,
});

const ensureDefaultMessageTemplates = async () => {
    await Promise.all(defaultMessageTemplates.map((template) => MessageTemplate.findOneAndUpdate(
        { key: template.key },
        { $setOnInsert: template },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    )));
};

const getAdminMessageTemplatesService = async () => {
    await ensureDefaultMessageTemplates();
    const [messageTemplates, emailTemplates] = await Promise.all([
        MessageTemplate.find({ active: true }).sort({ name: 1 }),
        EmailTemplate.find({ active: true }).sort({ name: 1 }),
    ]);

    return [
        ...messageTemplates.map((template) => normalizeTemplate(template, "Notification")),
        ...emailTemplates.map((template) => normalizeTemplate(template, "Email")),
    ];
};

const getRecipientFilter = (target) => {
    if (target === "Platform Admins") return { active: true, role: "admin" };
    if (target === "Leaders") return { active: true, role: "leader" };
    return { active: true };
};

const sendBroadcastEmails = async (recipients, notification) => {
    const settings = await getOrCreateSystemSettings();
    if (!settings.enableEmailNotifications) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Email notifications are disabled");
    }

    const from = `${settings.senderName} <${settings.senderEmail}>`;
    const html = `<h2>${escapeHtml(notification.title)}</h2><p>${escapeHtml(notification.message)}</p>`;
    const results = await Promise.allSettled(recipients.map((recipient) => sendSystemMail({
        from,
        to: recipient.email,
        subject: notification.title,
        text: notification.message,
        html,
    })));

    return {
        sent: results.filter((result) => result.status === "fulfilled").length,
        failed: results.filter((result) => result.status === "rejected").length,
    };
};

const createGlobalNotificationService = async (data, createdBy, io) => {
    const channels = Array.isArray(data.channels) ? data.channels : [];
    if (!data.title?.trim() || !data.message?.trim()) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Notification title and message are required");
    }
    if (!channels.length) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Select at least one delivery channel");
    }

    const recipients = await Account.find(getRecipientFilter(data.target)).select("_id email");
    const notification = await GlobalNotification.create({
        title: data.title.trim(),
        message: data.message.trim(),
        type: data.type || "Info",
        target: data.target || "All Users",
        channels,
        recipientCount: recipients.length,
        createdBy,
    });

    if (channels.includes("In-App")) {
        const inboxNotifications = await GlobalInboxNotification.insertMany(recipients.map((recipient) => ({
            recipientId: recipient._id,
            globalNotificationId: notification._id,
            message: notification.message,
            type: notification.type,
        })));
        if (io) {
            inboxNotifications.forEach((inboxNotification) => {
                io.to(`user_${inboxNotification.recipientId.toString()}`).emit("new_notification", inboxNotification);
            });
        }
    }

    if (channels.includes("Email")) {
        const emailResult = await sendBroadcastEmails(recipients, notification);
        notification.emailSentCount = emailResult.sent;
        notification.emailFailedCount = emailResult.failed;
        notification.status = emailResult.failed === 0
            ? "Sent"
            : emailResult.sent > 0 ? "Partially Sent" : "Failed";
        await notification.save();
    }

    return normalizeGlobalNotification(notification);
};

const getAllGlobalNotificationsService = async () => {
    const notifications = await GlobalNotification.find().sort({ sentAt: -1 }).limit(100);
    return notifications.map(normalizeGlobalNotification);
};

const deleteGlobalNotificationService = async (notificationId) => {
    const notification = await GlobalNotification.findByIdAndDelete(notificationId);
    if (!notification) throw new ApiError(StatusCodes.NOT_FOUND, "Global notification not found");
    await GlobalInboxNotification.deleteMany({ globalNotificationId: notificationId });
    return { message: "Global notification deleted successfully" };
};

module.exports = {
    createGlobalNotificationService,
    getAllGlobalNotificationsService,
    deleteGlobalNotificationService,
    getAdminMessageTemplatesService,
};
