const { pool } = require('../config/database');

class AssignmentRepository {
  // ── Create ──────────────────────────────────────────────────────────────
  async create({ courseId, title, description, dueDate, fileUrl, fileName, maxScore, createdBy }) {
    const [result] = await pool.execute(
      `INSERT INTO assignments
         (course_id, title, description, due_date, file_url, file_name, max_score, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [courseId, title, description, dueDate, fileUrl || null, fileName || null, maxScore || 100, createdBy]
    );
    return result.insertId;
  }

  // ── Read ────────────────────────────────────────────────────────────────
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT a.*, u.first_name, u.last_name,
              c.title AS course_title
       FROM assignments a
       JOIN users u ON a.created_by = u.id
       JOIN courses c ON a.course_id = c.id
       WHERE a.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async findByCourse(courseId) {
    const [rows] = await pool.execute(
      `SELECT a.*, u.first_name, u.last_name,
              (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) AS submission_count
       FROM assignments a
       JOIN users u ON a.created_by = u.id
       WHERE a.course_id = ?
       ORDER BY a.due_date ASC`,
      [courseId]
    );
    return rows;
  }

  // ── Update ──────────────────────────────────────────────────────────────
  async update(id, fields) {
    const allowed = ['title', 'description', 'due_date', 'file_url', 'file_name', 'max_score'];
    const setClauses = [];
    const values = [];

    Object.entries(fields).forEach(([key, val]) => {
      if (allowed.includes(key) && val !== undefined) {
        setClauses.push(`${key} = ?`);
        values.push(val);
      }
    });

    if (setClauses.length === 0) return;
    values.push(id);

    await pool.execute(
      `UPDATE assignments SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );
  }

  // ── Delete ──────────────────────────────────────────────────────────────
  async delete(id) {
    await pool.execute(`DELETE FROM assignments WHERE id = ?`, [id]);
  }

  // ── Upcoming deadlines (for deadline notifications) ──────────────────
  async findUpcomingDeadlines(hoursAhead = 24) {
    const [rows] = await pool.execute(
      `SELECT a.id, a.course_id, a.title, a.due_date
       FROM assignments a
       WHERE a.due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? HOUR)`,
      [hoursAhead]
    );
    return rows;
  }
}

module.exports = new AssignmentRepository();
