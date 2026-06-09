const { pool } = require('../config/database');

class GradeRepository {
  async create({ submissionId, mark, feedback, gradedBy }) {
    const [result] = await pool.execute(
      `INSERT INTO grades (submission_id, mark, feedback, graded_by)
       VALUES (?, ?, ?, ?)`,
      [submissionId, mark, feedback || null, gradedBy]
    );
    return result.insertId;
  }

  async findBySubmission(submissionId) {
    const [rows] = await pool.execute(
      `SELECT g.*, u.first_name, u.last_name
       FROM grades g
       JOIN users u ON g.graded_by = u.id
       WHERE g.submission_id = ?`,
      [submissionId]
    );
    return rows[0] || null;
  }

  async update(submissionId, { mark, feedback, gradedBy }) {
    await pool.execute(
      `UPDATE grades SET mark = ?, feedback = ?, graded_by = ?, graded_at = NOW()
       WHERE submission_id = ?`,
      [mark, feedback || null, gradedBy, submissionId]
    );
  }

  async upsert({ submissionId, mark, feedback, gradedBy }) {
    const existing = await this.findBySubmission(submissionId);
    if (existing) {
      await this.update(submissionId, { mark, feedback, gradedBy });
      return existing.id;
    }
    return await this.create({ submissionId, mark, feedback, gradedBy });
  }
}

module.exports = new GradeRepository();
