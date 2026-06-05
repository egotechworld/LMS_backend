const progressRepository = require('../repositories/progressRepository');
const quizRepository = require('../repositories/quizRepository');
const submissionRepository = require('../repositories/submissionRepository');
const enrollmentRepository = require('../repositories/enrollmentRepository');
const ApiError = require('../utils/ApiError');
const { recalculateCourseProgress } = require('../utils/progressHelper');
const { createNotification } = require('../utils/notificationHelper');
const { pool } = require('../config/database');

class ProgressService {
  /**
   * Mark a lesson as completed for a student.
   * Recalculates overall course progress.
   * Notifies the student if a quiz is attached to the lesson.
   */
  async markLessonComplete(studentId, lessonId) {
    // Verify lesson exists and get its course_id
    const [[lesson]] = await pool.execute(
      `SELECT l.id, l.course_id, l.title FROM lessons l WHERE l.id = ?`,
      [lessonId]
    );
    if (!lesson) throw new ApiError('Lesson not found', 404);

    // Must be enrolled
    const enrollment = await enrollmentRepository.findByStudentAndCourse(
      studentId,
      lesson.course_id
    );
    if (!enrollment) throw new ApiError('You are not enrolled in this course', 403);

    // Idempotent — ignore if already marked
    const alreadyDone = await progressRepository.isLessonComplete(studentId, lessonId);
    if (alreadyDone) {
      return { message: 'Lesson already marked as completed' };
    }

    await progressRepository.markLessonComplete(studentId, lessonId, lesson.course_id);
    await recalculateCourseProgress(studentId, lesson.course_id);

    // If a quiz exists for this lesson, notify the student
    const quiz = await quizRepository.findByLesson(lessonId);
    if (quiz) {
      await createNotification({
        userId: studentId,
        message: `A quiz is now available for lesson "${lesson.title}". Start it when you're ready!`,
        type: 'quiz_available',
        referenceId: quiz.id,
        referenceType: 'quiz',
      });
    }

    return { message: 'Lesson marked as completed' };
  }

  /**
   * Full course progress for a student:
   * - lessons (completed / remaining)
   * - overall percentage
   * - assignment statuses
   * - quiz scores
   */
  async getCourseProgress(studentId, courseId) {
    const enrollment = await enrollmentRepository.findByStudentAndCourse(studentId, courseId);
    if (!enrollment) throw new ApiError('You are not enrolled in this course', 403);

    // Lesson progress
    const lessonProgress = await progressRepository.getCourseProgress(studentId, courseId);

    // Assignment statuses
    const [assignments] = await pool.execute(
      `SELECT a.id, a.title, a.due_date, a.max_score,
              CASE
                WHEN s.id IS NULL THEN 'not_submitted'
                WHEN g.id IS NULL THEN 'submitted'
                ELSE 'graded'
              END AS status,
              g.mark, g.feedback, s.is_late
       FROM assignments a
       LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
       LEFT JOIN grades g ON g.submission_id = s.id
       WHERE a.course_id = ?
       ORDER BY a.due_date ASC`,
      [studentId, courseId]
    );

    // Quiz scores for this course
    const [quizScores] = await pool.execute(
      `SELECT q.id AS quiz_id, q.title AS quiz_title,
              qa.score, qa.total_marks, qa.submitted_at,
              l.title AS lesson_title
       FROM quizzes q
       JOIN lessons l ON q.lesson_id = l.id
       LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id
                                  AND qa.student_id = ?
                                  AND qa.is_submitted = 1
       WHERE q.course_id = ?
       ORDER BY l.order_index`,
      [studentId, courseId]
    );

    return {
      courseId,
      overallProgress: lessonProgress.percentage,
      lessonsCompleted: lessonProgress.completedCount,
      totalLessons: lessonProgress.totalCount,
      lessons: lessonProgress.lessons,
      assignments,
      quizScores,
    };
  }

  /** Instructor view: progress summary for all students in a course */
  async getStudentProgressByCourse(instructorId, courseId) {
    // Verify instructor owns the course
    const [[course]] = await pool.execute(
      `SELECT id, instructor_id FROM courses WHERE id = ?`,
      [courseId]
    );
    if (!course) throw new ApiError('Course not found', 404);
    if (course.instructor_id !== instructorId) throw new ApiError('Forbidden', 403);

    return progressRepository.getStudentProgressByCourse(courseId);
  }

  /** Instructor: students who haven't submitted a given assignment */
  async getStudentsWithoutSubmission(instructorId, assignmentId) {
    const [[assignment]] = await pool.execute(
      `SELECT a.*, c.instructor_id FROM assignments a
       JOIN courses c ON c.id = a.course_id WHERE a.id = ?`,
      [assignmentId]
    );
    if (!assignment) throw new ApiError('Assignment not found', 404);
    if (assignment.instructor_id !== instructorId) throw new ApiError('Forbidden', 403);

    return progressRepository.getStudentsWithoutSubmission(assignmentId, assignment.course_id);
  }
}

module.exports = new ProgressService();
