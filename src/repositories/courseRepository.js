const { pool } = require('../config/database');

class CourseRepository {
  async create(courseData) {
    const { title, description, instructorId, category, duration, level, thumbnail, is_free, price, currency, status } = courseData;
    const query = `
      INSERT INTO courses (title, description, instructor_id, category, duration, level, thumbnail, is_free, price, currency, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(query, [
      title, description, instructorId, category, duration, level, thumbnail, 
      is_free !== undefined ? is_free : 1, 
      price || 0, 
      currency || 'usd',
      status === 'published' ? 'published' : 'draft'
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

  async findAll(filters = {}, viewer = null) {
    let query = `
      SELECT c.*, u.first_name, u.last_name
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      WHERE 1=1
    `;
    const params = [];

    const wantsOwnCourses = filters.scope === 'mine'
      && viewer?.role === 'instructor';
    if (wantsOwnCourses) {
      query += ` AND c.instructor_id = ?`;
      params.push(viewer.id);
    } else if (viewer?.role === 'admin') {
      if (filters.status) {
        query += ` AND c.status = ?`;
        params.push(filters.status);
      }
    } else {
      query += ` AND c.status = 'published'`;
    }

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

    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 10;
    const offset = (page - 1) * limit;

    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await pool.query(query, params);
    return rows;
  }

  async update(id, updateData) {
    const allowedFields = new Set([
      'title', 'description', 'category', 'duration', 'level', 'thumbnail',
      'price', 'currency', 'is_free', 'status',
    ]);
    const fields = [];
    const values = [];

    Object.keys(updateData).forEach(key => {
      if (allowedFields.has(key) && updateData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });

    if (fields.length === 0) return;
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
