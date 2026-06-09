/**
 * Central helper for creating in-app notifications.
 * All notification-triggering code across the app should use this.
 */
const { pool } = require('../config/database');

/**
 * Insert a notification row.
 *
 * @param {object} opts
 * @param {number}   opts.userId
 * @param {string}   opts.message
 * @param {string}   [opts.type='general']
 * @param {number}   [opts.referenceId]
 * @param {string}   [opts.referenceType]
 */
const createNotification = async ({
  userId,
  message,
  type = 'general',
  referenceId = null,
  referenceType = null,
}) => {
  const query = `
    INSERT INTO notifications (user_id, message, type, reference_id, reference_type)
    VALUES (?, ?, ?, ?, ?)
  `;
  await pool.execute(query, [userId, message, type, referenceId, referenceType]);
};

/**
 * Bulk-notify multiple users with the same message.
 *
 * @param {number[]} userIds
 * @param {string}   message
 * @param {string}   [type]
 * @param {number}   [referenceId]
 * @param {string}   [referenceType]
 */
const createBulkNotifications = async (
  userIds,
  message,
  type = 'general',
  referenceId = null,
  referenceType = null
) => {
  if (!userIds || userIds.length === 0) return;

  const placeholders = userIds.map(() => '(?, ?, ?, ?, ?)').join(', ');
  const values = userIds.flatMap((id) => [id, message, type, referenceId, referenceType]);

  const query = `
    INSERT INTO notifications (user_id, message, type, reference_id, reference_type)
    VALUES ${placeholders}
  `;
  await pool.execute(query, values);
};

module.exports = { createNotification, createBulkNotifications };
