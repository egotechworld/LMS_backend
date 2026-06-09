const { pool } = require('../config/database');

class NotificationRepository {
  async findByUser(userId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.execute(
      `SELECT * FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return rows;
  }

  async countUnread(userId) {
    const [[{ count }]] = await pool.execute(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [userId]
    );
    return count;
  }

  async markAsRead(notificationId, userId) {
    const [result] = await pool.execute(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );
    return result.affectedRows > 0;
  }

  async markAllAsRead(userId) {
    await pool.execute(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ?`,
      [userId]
    );
  }
}

module.exports = new NotificationRepository();
