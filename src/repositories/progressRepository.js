const { pool } = require('../config/database');

class ProgressRepository {
  // ── Lesson completion ────────────────────────────────────────────────────
  async markLessonComplete(studentId, lessonId, courseId) {
    await pool.execute(
      `INSERT IGNORE INTO lesson_progress (student_id, lesson_id, course_id)
       VALUES (?, ?, ?)`,
      [studentId, lessonId, courseId]
    );
  }

  async isLessonComplete(studentId, lessonId) {
    const [[{ count }]] = await pool.execute(
      `SELECT COUNT(*) AS count FROM lesson_progress
       WHERE student_id = ? AND lesson_id = ?`,
      [studentId, lessonId]
    );
    return count > 0;
  }

  async getCompletedLessons(studentId, courseId) {
    const [rows] = await pool.execute(
      `SELECT lp.*, l.title AS lesson_title, l.order_index
       FROM lesson_progress lp
       JOIN lessons l ON lp.lesson_id = l.id
       WHERE lp.student_id = ? AND lp.course_id = ?
       ORDER BY l.order_index`,
      [studentId, courseId]
    );
    return rows;
  }

  // ── Course-level progress ─────────────────────────────────────────────────
  async getCourseProgress(studentId, courseId) {
    // All lessons
    const [allLessons] = await pool.execute(
      `SELECT l.id, l.title, l.order_index
       FROM lessons l WHERE l.course_id = ?
       ORDER BY l.order_index`,
      [courseId]
    );

    // Completed lesson IDs
    const [completed] = await pool.execute(
      `SELECT lesson_id FROM lesson_progress
       WHERE student_id = ? AND course_id = ?`,
      [studentId, courseId]
    );
    const completedSet = new Set(completed.map((r) => r.lesson_id));

    const lessons = allLessons.map((l) => ({
      ...l,
      completed: completedSet.has(l.id),
    }));

    const percentage = allLessons.length
      ? ((completedSet.size / allLessons.length) * 100).toFixed(2)
      : '0.00';

    return { lessons, completedCount: completedSet.size, totalCount: allLessons.length, percentage };
  }

  // ── Instructor view: who completed which lesson ───────────────────────────
  async getStudentProgressByCourse(courseId) {
    const [rows] = await pool.execute(
      `SELECT u.id AS student_id, u.first_name, u.last_name, u.email,
              COUNT(lp.id) AS lessons_completed,
              (SELECT COUNT(*) FROM lessons WHERE course_id = ?) AS total_lessons,
              e.progress AS progress_pct, e.status
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       LEFT JOIN lesson_progress lp ON lp.student_id = u.id AND lp.course_id = ?
       WHERE e.course_id = ?
       GROUP BY u.id, u.first_name, u.last_name, u.email, e.progress, e.status`,
      [courseId, courseId, courseId]
    );
    return rows;
  }

  // ── Who has NOT submitted a pending assignment ────────────────────────────
  async getStudentsWithoutSubmission(assignmentId, courseId) {
    const [rows] = await pool.execute(
      `SELECT u.id, u.first_name, u.last_name, u.email
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       WHERE e.course_id = ?
         AND u.id NOT IN (
           SELECT student_id FROM submissions WHERE assignment_id = ?
         )`,
      [courseId, assignmentId]
    );
    return rows;
  }
}

module.exports = new ProgressRepository();
