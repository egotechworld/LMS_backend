const { pool } = require('../config/database');

class EnrollmentRepository {
  async create(studentId, courseId) {
    const query = `
      INSERT INTO enrollments (student_id, course_id)
      VALUES (?, ?)
    `;
    const [result] = await pool.execute(query, [studentId, courseId]);
    return result.insertId;
  }

  async findById(id) {
    const query = `
      SELECT e.*, c.title as course_title, u.first_name, u.last_name
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON e.student_id = u.id
      WHERE e.id = ?
    `;
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  async findByStudent(studentId) {
    const query = `
      SELECT e.*, c.title, c.description, c.category, c.thumbnail,
             u.first_name as instructor_first_name, u.last_name as instructor_last_name
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      WHERE e.student_id = ?
      ORDER BY e.enrolled_at DESC
    `;
    const [rows] = await pool.execute(query, [studentId]);
    return rows;
  }

  async findByCourse(courseId) {
    const query = `
      SELECT e.*, u.first_name, u.last_name, u.email
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      WHERE e.course_id = ?
      ORDER BY e.enrolled_at DESC
    `;
    const [rows] = await pool.execute(query, [courseId]);
    return rows;
  }

  async findByStudentAndCourse(studentId, courseId) {
    const query = `
      SELECT * FROM enrollments
      WHERE student_id = ? AND course_id = ?
    `;
    const [rows] = await pool.execute(query, [studentId, courseId]);
    return rows[0];
  }

  async delete(studentId, courseId) {
    const query = `DELETE FROM enrollments WHERE student_id = ? AND course_id = ?`;
    await pool.execute(query, [studentId, courseId]);
  }
}

module.exports = new EnrollmentRepository();
