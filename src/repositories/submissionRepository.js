const { pool } = require('../config/database');

class SubmissionRepository {
  // ── Create ──────────────────────────────────────────────────────────────
  async create({ assignmentId, studentId, fileUrl, fileName, textResponse, isLate }) {
    const [result] = await pool.execute(
      `INSERT INTO submissions
         (assignment_id, student_id, file_url, file_name, text_response, is_late)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [assignmentId, studentId, fileUrl || null, fileName || null, textResponse || null, isLate ? 1 : 0]
    );
    return result.insertId;
  }

  // ── Read ────────────────────────────────────────────────────────────────
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT s.*,
              u.first_name, u.last_name, u.email,
              g.mark, g.feedback, g.graded_at,
              gu.first_name AS grader_first_name, gu.last_name AS grader_last_name
       FROM submissions s
       JOIN users u ON s.student_id = u.id
       LEFT JOIN grades g ON g.submission_id = s.id
       LEFT JOIN users gu ON g.graded_by = gu.id
       WHERE s.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async findByAssignment(assignmentId) {
    const [rows] = await pool.execute(
      `SELECT s.*,
              u.first_name, u.last_name, u.email,
              g.mark, g.feedback, g.graded_at
       FROM submissions s
       JOIN users u ON s.student_id = u.id
       LEFT JOIN grades g ON g.submission_id = s.id
       WHERE s.assignment_id = ?
       ORDER BY s.submitted_at ASC`,
      [assignmentId]
    );
    return rows;
  }

  async findByStudent(studentId) {
    const [rows] = await pool.execute(
      `SELECT s.*, a.title AS assignment_title, a.due_date, a.max_score, a.course_id,
              g.mark, g.feedback, g.graded_at
       FROM submissions s
       JOIN assignments a ON s.assignment_id = a.id
       LEFT JOIN grades g ON g.submission_id = s.id
       WHERE s.student_id = ?
       ORDER BY s.submitted_at DESC`,
      [studentId]
    );
    return rows;
  }

  async findByStudentAndAssignment(studentId, assignmentId) {
    const [rows] = await pool.execute(
      `SELECT * FROM submissions WHERE student_id = ? AND assignment_id = ?`,
      [studentId, assignmentId]
    );
    return rows[0] || null;
  }

  // ── Delete ──────────────────────────────────────────────────────────────
  async delete(id) {
    await pool.execute(`DELETE FROM submissions WHERE id = ?`, [id]);
  }
}

module.exports = new SubmissionRepository();
