const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// ── Student routes ────────────────────────────────────────────────────────────

// POST /api/progress/complete  — mark a lesson as completed
router.post('/complete', authenticate, authorize('student'), progressController.markLessonComplete);

// GET /api/progress/:courseId  — full progress for a course
router.get('/:courseId', authenticate, authorize('student'), progressController.getCourseProgress);

// ── Instructor routes ─────────────────────────────────────────────────────────

// GET /api/progress/course/:courseId/students
router.get(
  '/course/:courseId/students',
  authenticate,
  authorize('instructor', 'admin'),
  progressController.getStudentProgressByCourse
);

// GET /api/progress/assignment/:assignmentId/missing
router.get(
  '/assignment/:assignmentId/missing',
  authenticate,
  authorize('instructor', 'admin'),
  progressController.getStudentsWithoutSubmission
);

module.exports = router;
