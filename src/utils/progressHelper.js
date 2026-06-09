/**
 * Recalculates and persists a student's overall progress percentage
 * for a given course based on completed lessons.
 */
const { pool } = require('../config/database');

/**
 * @param {number} studentId
 * @param {number} courseId
 */
const recalculateCourseProgress = async (studentId, courseId) => {
  // Total lessons in the course
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM lessons WHERE course_id = ?`,
    [courseId]
  );

  if (total === 0) return;

  // Completed lessons by the student in this course
  const [[{ completed }]] = await pool.execute(
    `SELECT COUNT(*) AS completed FROM lesson_progress
     WHERE student_id = ? AND course_id = ?`,
    [studentId, courseId]
  );

  const percentage = ((completed / total) * 100).toFixed(2);

  const newStatus = parseFloat(percentage) >= 100 ? 'completed' : 'active';

  await pool.execute(
    `UPDATE enrollments
     SET progress = ?, status = ?
     WHERE student_id = ? AND course_id = ?`,
    [percentage, newStatus, studentId, courseId]
  );
};

module.exports = { recalculateCourseProgress };
