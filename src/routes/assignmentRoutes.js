const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { assignmentUploader } = require('../config/multer');
const { body } = require('express-validator');

// ── Validation rules (reusable) ──────────────────────────────────────────────
const createAssignmentRules = [
  body('courseId').isInt({ min: 1 }).withMessage('Valid courseId required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('dueDate').isISO8601().withMessage('Valid due date required (ISO 8601)'),
];

const gradeRules = [
  body('submissionId').isInt({ min: 1 }).withMessage('Valid submissionId required'),
  body('mark').isInt({ min: 0 }).withMessage('Mark must be a non-negative integer'),
];

// ── Assignment CRUD (instructor / admin) ─────────────────────────────────────

// GET /api/assignments/course/:courseId
router.get(
  '/course/:courseId',
  authenticate,
  assignmentController.getAssignmentsByCourse
);

// GET /api/assignments/:id
router.get('/:id', authenticate, assignmentController.getAssignment);

// POST /api/assignments  (optional reference file)
router.post(
  '/',
  authenticate,
  authorize('instructor', 'admin'),
  assignmentUploader.single('referenceFile'),
  createAssignmentRules,
  assignmentController.createAssignment
);

// PUT /api/assignments/:id
router.put(
  '/:id',
  authenticate,
  authorize('instructor', 'admin'),
  assignmentUploader.single('referenceFile'),
  assignmentController.updateAssignment
);

// DELETE /api/assignments/:id
router.delete(
  '/:id',
  authenticate,
  authorize('instructor', 'admin'),
  assignmentController.deleteAssignment
);

// ── Submissions ──────────────────────────────────────────────────────────────

// POST /api/assignments/submissions  (file or text) — student
router.post(
  '/submissions',
  authenticate,
  authorize('student'),
  assignmentUploader.single('submissionFile'),
  assignmentController.submitAssignment
);

// GET /api/assignments/submissions/my  — must be BEFORE /:assignmentId param
router.get(
  '/submissions/my',
  authenticate,
  authorize('student'),
  assignmentController.getMySubmissions
);

// GET /api/assignments/submissions/:assignmentId — instructor sees all, student sees own
router.get(
  '/submissions/:assignmentId',
  authenticate,
  assignmentController.getSubmissionsByAssignment
);

// ── Grading (instructor / admin) ─────────────────────────────────────────────

// POST /api/assignments/grades
router.post(
  '/grades',
  authenticate,
  authorize('instructor', 'admin'),
  gradeRules,
  assignmentController.gradeSubmission
);

// GET /api/assignments/grades/:submissionId
router.get('/grades/:submissionId', authenticate, assignmentController.getGrade);

module.exports = router;
