const { pool } = require('../config/database');

class DashboardRepository {
  // ── Student ───────────────────────────────────────────────────────────────
  async getStudentDashboard(studentId) {
    // Enrolled courses with progress
    const [enrolledCourses] = await pool.execute(
      `SELECT e.progress, e.status, e.enrolled_at,
              c.id AS course_id, c.title, c.thumbnail, c.category,
              u.first_name AS instructor_first, u.last_name AS instructor_last
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       JOIN users u ON c.instructor_id = u.id
       WHERE e.student_id = ? AND e.status != 'dropped'
       ORDER BY e.enrolled_at DESC`,
      [studentId]
    );

    // Upcoming assignment deadlines (next 7 days)
    const [upcomingDeadlines] = await pool.execute(
      `SELECT a.id, a.title, a.due_date, a.course_id, c.title AS course_title,
              CASE WHEN s.id IS NULL THEN 'not_submitted'
                   WHEN g.id IS NULL THEN 'submitted'
                   ELSE 'graded' END AS submission_status
       FROM assignments a
       JOIN courses c ON a.course_id = c.id
       JOIN enrollments e ON e.course_id = a.course_id AND e.student_id = ?
       LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
       LEFT JOIN grades g ON g.submission_id = s.id
       WHERE a.due_date >= NOW() AND a.due_date <= DATE_ADD(NOW(), INTERVAL 7 DAY)
       ORDER BY a.due_date ASC`,
      [studentId, studentId]
    );

    return { enrolledCourses, upcomingDeadlines };
  }

  // ── Instructor ────────────────────────────────────────────────────────────
  async getInstructorDashboard(instructorId) {
    // Courses with enrolment counts
    const [courses] = await pool.execute(
      `SELECT c.id, c.title, c.status, c.thumbnail,
              COUNT(e.id) AS total_enrollments
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id
       WHERE c.instructor_id = ?
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [instructorId]
    );

    // Total unique students
    const [[{ totalStudents }]] = await pool.execute(
      `SELECT COUNT(DISTINCT e.student_id) AS totalStudents
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE c.instructor_id = ?`,
      [instructorId]
    );

    // Recent ungraded submissions
    const [pendingSubmissions] = await pool.execute(
      `SELECT s.id AS submission_id, s.submitted_at, s.is_late,
              u.first_name, u.last_name, u.email,
              a.title AS assignment_title, a.course_id,
              c.title AS course_title
       FROM submissions s
       JOIN assignments a ON s.assignment_id = a.id
       JOIN courses c ON a.course_id = c.id
       JOIN users u ON s.student_id = u.id
       LEFT JOIN grades g ON g.submission_id = s.id
       WHERE c.instructor_id = ? AND g.id IS NULL
       ORDER BY s.submitted_at DESC
       LIMIT 10`,
      [instructorId]
    );

    return { courses, totalStudents, pendingSubmissions };
  }

  // ── Admin ─────────────────────────────────────────────────────────────────
  async getAdminDashboard() {
    const [[{ totalStudents }]] = await pool.execute(
      `SELECT COUNT(*) AS totalStudents FROM users WHERE role = 'student'`
    );
    const [[{ totalInstructors }]] = await pool.execute(
      `SELECT COUNT(*) AS totalInstructors FROM users WHERE role = 'instructor'`
    );
    const [[{ totalCourses }]] = await pool.execute(
      `SELECT COUNT(*) AS totalCourses FROM courses`
    );
    const [[{ totalRevenue }]] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) AS totalRevenue FROM payments WHERE status = 'success'`
    );

    // Recently registered users
    const [recentUsers] = await pool.execute(
      `SELECT id, email, first_name, last_name, role, created_at
       FROM users ORDER BY created_at DESC LIMIT 10`
    );

    return { totalStudents, totalInstructors, totalCourses, totalRevenue, recentUsers };
  }
}

module.exports = new DashboardRepository();
