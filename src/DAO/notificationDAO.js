const Notification = require("../models/notification");

class NotificationDAO {
    async createNotification(data) {
        const newNotification = new Notification(data);
        return await newNotification.save();
    }

    async getNotificationsByUserId(userId) {
        return await Notification.find({ recipientId: userId })
            .sort({ createdAt: -1 })
            .populate('issueId', 'issueKey title dueDate status');
    }

    async getNotificationByIdAndUser(notificationId, userId) {
        return await Notification.findOne({ _id: notificationId, recipientId: userId });
    }

    async deleteNotification(notificationId) {
        return await Notification.findByIdAndDelete(notificationId);
    }
}

module.exports = new NotificationDAO();