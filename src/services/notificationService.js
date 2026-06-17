const notificationDAO = require("../DAO/notificationDAO");
const issueDAO = require("../DAO/issueDAO");
const projectDAO = require("../DAO/projectDAO");
const { sendTaskAlertEmail } = require("../utils/mailer");
const { env } = require("../config/env");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");
const GlobalInboxNotification = require("../models/globalInboxNotification");

const getMyNotificationsService = async (userId) => {
    const [issueNotifications, globalNotifications] = await Promise.all([
        notificationDAO.getNotificationsByUserId(userId),
        GlobalInboxNotification.find({ recipientId: userId }).sort({ createdAt: -1 }),
    ]);
    return [...issueNotifications, ...globalNotifications]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const deleteNotificationService = async (notificationId, userId) => {
    const notif = await notificationDAO.getNotificationByIdAndUser(notificationId, userId);
    if (notif) {
        await notificationDAO.deleteNotification(notificationId);
        return { message: "Notification deleted successfully." };
    }

    const globalNotification = await GlobalInboxNotification.findOneAndDelete({ _id: notificationId, recipientId: userId });
    if (!globalNotification) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Notification not found or access denied.");
    }

    return { message: "Notification deleted successfully." };
};

// Hàm xử lý việc xác định Issue đến hạn và tạo thông báo
const generateDueIssueNotifications = async (io, projectId) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const todayString = startOfDay.toISOString().split('T')[0];

        const project = await projectDAO.getProjectById(projectId);
        const projectName = project ? project.name : "Your Project";

        const dueIssues = await issueDAO.getDueIssues(startOfDay, endOfDay, projectId);

        for (const issue of dueIssues) {
            try {
                const notificationData = {
                    recipientId: issue.assigneeId._id,
                    issueId: issue._id,
                    message: `Issue ${issue.issueKey}: "${issue.title}" is due today.`,
                    type: 'DUE_TODAY',
                    notifiedDate: todayString
                };

                const newNotif = await notificationDAO.createNotification(notificationData);

                const populatedNotif = await notificationDAO.getNotificationByIdAndUser(newNotif._id, newNotif.recipientId);

                // Nếu khởi tạo thành công (không bị lỗi trùng lặp dữ liệu), sẽ gửi realtime qua socket
                if (io) {
                    io.to(`user_${issue.assigneeId._id.toString()}`).emit('new_notification', populatedNotif);
                }

                // Gửi cảnh báo qua Email
                if (issue.assigneeId && issue.assigneeId.email) {
                    const assigneeName = issue.assigneeId.fullName || issue.assigneeId.username;
                    const taskLink = `${env.clientUrl}/projects/${projectId}/list?issueId=${issue._id}&intendedUser=${issue.assigneeId._id}`;
                    const alertTitle = "Task Due Today";
                    const alertMessage = "This is a reminder that your task is due today. Please update the status if it has been completed.";
                    
                    sendTaskAlertEmail(
                        issue.assigneeId.email,
                        assigneeName,
                        projectName,
                        issue.issueKey,
                        issue.title,
                        alertTitle,
                        alertMessage,
                        taskLink
                    ).catch(err => console.error(`[Mailer] Failed to send due task email for ${issue.issueKey}:`, err.message));
                }
            } catch (error) {
                // Mã lỗi 11000 = unique duplicate key -> Bỏ qua lỗi này vì nó đồng nghĩa trong hôm nay báo cáo này ĐÃ ĐƯỢC GỬI.
                if (error.code !== 11000) {
                    console.error(`Failed to create notification for issue ${issue._id}`, error);
                }
            }
        }
    } catch (error) {
        console.error("Error in generateDueIssueNotifications:", error);
    }
}

module.exports = {
    getMyNotificationsService,
    deleteNotificationService,
    generateDueIssueNotifications
};
