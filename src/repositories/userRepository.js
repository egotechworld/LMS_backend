const { pool } = require('../config/database');

class UserRepository {
  async create(userData) {
    const { email, password, firstName, lastName, role } = userData;
    const query = `
      INSERT INTO users (email, password, first_name, last_name, role)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(query, [email, password, firstName, lastName, role]);
    return result.insertId;
  }

  async findById(id) {
    const query = `
      SELECT id, email, first_name, last_name, role, created_at, updated_at
      FROM users WHERE id = ?
    `;
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  async findByEmail(email) {
    const query = `SELECT * FROM users WHERE email = ?`;
    const [rows] = await pool.execute(query, [email]);
    return rows[0];
  }

  async findAll(filters = {}) {
    let query = `
      SELECT id, email, first_name, last_name, role, created_at
      FROM users WHERE 1=1
    `;
    const params = [];

    if (filters.role) {
      query += ` AND role = ?`;
      params.push(filters.role);
    }

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
    const query = `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`;
    await pool.execute(query, values);
  }

  async delete(id) {
    const query = `DELETE FROM users WHERE id = ?`;
    await pool.execute(query, [id]);
  }
}

module.exports = new UserRepository();
