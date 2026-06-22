const { pool } = require('../config/database');

class LessonRepository {
  async create(lessonData) {
    const { course_id, title, content, video_url, audio_url, document_url, order_index, is_published } = lessonData;
    const query = `
      INSERT INTO lessons (course_id, title, content, video_url, audio_url, document_url, order_index, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(query, [
      course_id, title, content || null, video_url || null, audio_url || null, document_url || null, 
      order_index || 0, is_published !== undefined ? is_published : false
    ]);
    return result.insertId;
  }

  async findById(id) {
    const query = `SELECT * FROM lessons WHERE id = ?`;
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  async findByCourseId(courseId) {
    const query = `SELECT * FROM lessons WHERE course_id = ? ORDER BY order_index ASC, created_at ASC`;
    const [rows] = await pool.query(query, [courseId]);
    return rows;
  }

  async update(id, updateData) {
    const fields = [];
    const values = [];

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });

    if (fields.length === 0) return;

    values.push(id);
    const query = `UPDATE lessons SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`;
    await pool.execute(query, values);
  }

  async delete(id) {
    const query = `DELETE FROM lessons WHERE id = ?`;
    await pool.execute(query, [id]);
  }
}

module.exports = new LessonRepository();
