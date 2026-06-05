const { pool } = require('../config/database');

class PaymentRepository {
  async create({ studentId, courseId, stripeSessionId, amount, currency }) {
    const [result] = await pool.execute(
      `INSERT INTO payments (student_id, course_id, stripe_session_id, amount, currency, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [studentId, courseId, stripeSessionId, amount, currency || 'usd']
    );
    return result.insertId;
  }

  async findBySessionId(sessionId) {
    const [rows] = await pool.execute(
      `SELECT * FROM payments WHERE stripe_session_id = ?`,
      [sessionId]
    );
    return rows[0] || null;
  }

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT p.*, u.first_name, u.last_name, u.email, c.title AS course_title
       FROM payments p
       JOIN users u ON p.student_id = u.id
       JOIN courses c ON p.course_id = c.id
       WHERE p.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async findByStudent(studentId) {
    const [rows] = await pool.execute(
      `SELECT p.*, c.title AS course_title, c.thumbnail
       FROM payments p
       JOIN courses c ON p.course_id = c.id
       WHERE p.student_id = ? AND p.status = 'success'
       ORDER BY p.paid_at DESC`,
      [studentId]
    );
    return rows;
  }

  async findAll({ page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.execute(
      `SELECT p.*, u.first_name, u.last_name, u.email, c.title AS course_title
       FROM payments p
       JOIN users u ON p.student_id = u.id
       JOIN courses c ON p.course_id = c.id
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows;
  }

  async markSuccess(sessionId, stripePaymentId) {
    await pool.execute(
      `UPDATE payments
       SET status = 'success', stripe_payment_id = ?, paid_at = NOW()
       WHERE stripe_session_id = ?`,
      [stripePaymentId, sessionId]
    );
  }

  async markFailed(sessionId) {
    await pool.execute(
      `UPDATE payments SET status = 'failed' WHERE stripe_session_id = ?`,
      [sessionId]
    );
  }

  async getTotalRevenue() {
    const [[{ total }]] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'success'`
    );
    return total;
  }

  async getRevenuePerCourse() {
    const [rows] = await pool.execute(
      `SELECT c.id AS course_id, c.title,
              COUNT(p.id) AS transaction_count,
              COALESCE(SUM(p.amount), 0) AS total_revenue
       FROM payments p
       JOIN courses c ON p.course_id = c.id
       WHERE p.status = 'success'
       GROUP BY c.id, c.title
       ORDER BY total_revenue DESC`
    );
    return rows;
  }
}

module.exports = new PaymentRepository();
