const { pool } = require('../config/database');

class OrderRepository {
  async create({ studentId, courseId, stripeSessionId, amount, currency }) {
    const [result] = await pool.execute(
      `INSERT INTO orders (student_id, course_id, stripe_session_id, amount, currency, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [studentId, courseId, stripeSessionId, amount, currency || 'usd']
    );
    return result.insertId;
  }

  async findBySessionId(sessionId) {
    const [rows] = await pool.execute(
      `SELECT * FROM orders WHERE stripe_session_id = ?`,
      [sessionId]
    );
    return rows[0] || null;
  }

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT o.*, u.first_name, u.last_name, u.email, c.title AS course_title
       FROM orders o
       JOIN users u ON o.student_id = u.id
       JOIN courses c ON o.course_id = c.id
       WHERE o.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async findByStudent(studentId) {
    const [rows] = await pool.execute(
      `SELECT o.*, c.title AS course_title, c.thumbnail
       FROM orders o
       JOIN courses c ON o.course_id = c.id
       WHERE o.student_id = ? AND o.status = 'paid'
       ORDER BY o.paid_at DESC`,
      [studentId]
    );
    return rows;
  }

  async findAll({ page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.execute(
      `SELECT o.*, u.first_name, u.last_name, u.email, c.title AS course_title
       FROM orders o
       JOIN users u ON o.student_id = u.id
       JOIN courses c ON o.course_id = c.id
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows;
  }

  async markPaid(sessionId, stripePaymentIntentId, receiptUrl) {
    await pool.execute(
      `UPDATE orders
       SET status = 'paid', stripe_payment_intent_id = ?, receipt_url = ?, paid_at = NOW()
       WHERE stripe_session_id = ? AND status = 'pending'`,
      [stripePaymentIntentId, receiptUrl, sessionId]
    );
  }

  async markFailed(sessionId) {
    await pool.execute(
      `UPDATE orders SET status = 'failed' WHERE stripe_session_id = ? AND status = 'pending'`,
      [sessionId]
    );
  }
  
  async markRefunded(paymentIntentId) {
    await pool.execute(
      `UPDATE orders SET status = 'refunded' WHERE stripe_payment_intent_id = ?`,
      [paymentIntentId]
    );
  }

  async getTotalRevenue() {
    const [[{ total }]] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM orders WHERE status = 'paid'`
    );
    return total;
  }

  async getRevenuePerCourse() {
    const [rows] = await pool.execute(
      `SELECT c.id AS course_id, c.title,
              COUNT(o.id) AS transaction_count,
              COALESCE(SUM(o.amount), 0) AS total_revenue
       FROM orders o
       JOIN courses c ON o.course_id = c.id
       WHERE o.status = 'paid'
       GROUP BY c.id, c.title
       ORDER BY total_revenue DESC`
    );
    return rows;
  }
}

module.exports = new OrderRepository();
