const notificationService = require('../services/notificationService');
const asyncHandler = require('../utils/asyncHandler');

class NotificationController {
  /**
   * GET /api/notifications
   * Returns paginated notifications + unread count for the logged-in user.
   */
  getMyNotifications = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const data = await notificationService.getMyNotifications(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
    });
    res.json({ success: true, data });
  });

  /**
   * PUT /api/notifications/:id/read
   * Marks a single notification as read.
   */
  markAsRead = asyncHandler(async (req, res) => {
    const result = await notificationService.markAsRead(
      req.user.id,
      parseInt(req.params.id)
    );
    res.json({ success: true, ...result });
  });

  /**
   * PUT /api/notifications/read-all
   * Marks all notifications as read for the logged-in user.
   */
  markAllAsRead = asyncHandler(async (req, res) => {
    const result = await notificationService.markAllAsRead(req.user.id);
    res.json({ success: true, ...result });
  });
}

module.exports = new NotificationController();
