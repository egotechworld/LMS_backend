const { pool } = require('../config/database');

class CourseRepository {
  async create(courseData) {
    const { title, description, instructorId, category, duration, level, thumbnail } = courseData;
    const query = `
      INSERT INTO courses (title, description, instructor_id, category, duration, level, thumbnail)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(query, [
      title, description, instructorId, category, duration, level, thumbnail
    ]);
    return result.insertId;
  }

  async findById(id) {
    const query = `
      SELECT c.*, u.first_name, u.last_name, u.email as instructor_email
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      WHERE c.id = ?
    `;
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  async findAll(filters = {}) {
    let query = `
      SELECT c.*, u.first_name, u.last_name
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.category) {
      query += ` AND c.category = ?`;
      params.push(filters.category);
    }

    if (filters.search) {
      query += ` AND (c.title LIKE ? OR c.description LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ` ORDER BY c.created_at DESC`;

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const offset = (page - 1) * limit;

    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);
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

    values.push(id);
    const query = `UPDATE courses SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`;
    await pool.execute(query, values);
  }

  async delete(id) {
    const query = `DELETE FROM courses WHERE id = ?`;
    await pool.execute(query, [id]);
  }
}

module.exports = new CourseRepository();
