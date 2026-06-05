const notificationRepository = require('../repositories/notificationRepository');
const ApiError = require('../utils/ApiError');

class NotificationService {
  async getMyNotifications(userId, { page, limit } = {}) {
    const notifications = await notificationRepository.findByUser(userId, { page, limit });
    const unreadCount = await notificationRepository.countUnread(userId);
    return { notifications, unreadCount };
  }

  async markAsRead(userId, notificationId) {
    const updated = await notificationRepository.markAsRead(notificationId, userId);
    if (!updated) throw new ApiError('Notification not found', 404);
    return { success: true };
  }

  async markAllAsRead(userId) {
    await notificationRepository.markAllAsRead(userId);
    return { success: true };
  }
}

module.exports = new NotificationService();
