const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { body } = require('express-validator');

// ── Validation rules ─────────────────────────────────────────────────────────
const createQuizRules = [
  body('lessonId').isInt({ min: 1 }).withMessage('Valid lessonId required'),
  body('courseId').isInt({ min: 1 }).withMessage('Valid courseId required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
];

const addQuestionRules = [
  body('questionText').trim().notEmpty().withMessage('Question text is required'),
  body('optionA').trim().notEmpty().withMessage('Option A is required'),
  body('optionB').trim().notEmpty().withMessage('Option B is required'),
  body('optionC').trim().notEmpty().withMessage('Option C is required'),
  body('optionD').trim().notEmpty().withMessage('Option D is required'),
  body('correctOption')
    .isIn(['a', 'b', 'c', 'd'])
    .withMessage('correctOption must be one of: a, b, c, d'),
  body('marks').optional().isInt({ min: 1 }).withMessage('Marks must be a positive integer'),
];

// ── Instructor: quiz bank management ─────────────────────────────────────────

// GET /api/quizzes/course/:courseId  — all quizzes for a course
router.get(
  '/course/:courseId',
  authenticate,
  authorize('instructor', 'admin'),
  quizController.getQuizzesByCourse
);

// GET /api/quizzes/lesson/:lessonId  — quiz for a specific lesson (instructor view)
router.get(
  '/lesson/:lessonId',
  authenticate,
  authorize('instructor', 'admin'),
  quizController.getQuizByLesson
);

// POST /api/quizzes
router.post(
  '/',
  authenticate,
  authorize('instructor', 'admin'),
  createQuizRules,
  quizController.createQuiz
);

// PUT /api/quizzes/:id
router.put(
  '/:id',
  authenticate,
  authorize('instructor', 'admin'),
  quizController.updateQuiz
);

// DELETE /api/quizzes/:id
router.delete(
  '/:id',
  authenticate,
  authorize('instructor', 'admin'),
  quizController.deleteQuiz
);

// ── Questions ────────────────────────────────────────────────────────────────

// GET /api/quizzes/:quizId/questions  — instructor view (includes correct answers)
router.get(
  '/:quizId/questions',
  authenticate,
  authorize('instructor', 'admin'),
  quizController.getQuestionsForInstructor
);

// POST /api/quizzes/:quizId/questions
router.post(
  '/:quizId/questions',
  authenticate,
  authorize('instructor', 'admin'),
  addQuestionRules,
  quizController.addQuestion
);

// DELETE /api/quizzes/questions/:questionId
router.delete(
  '/questions/:questionId',
  authenticate,
  authorize('instructor', 'admin'),
  quizController.deleteQuestion
);

// GET /api/quizzes/:quizId/results  — instructor: see all student results
router.get(
  '/:quizId/results',
  authenticate,
  authorize('instructor', 'admin'),
  quizController.getQuizResults
);

// ── Student quiz flow ─────────────────────────────────────────────────────────

// GET /api/quizzes/lesson/:lessonId/take  — get quiz after completing the lesson
router.get(
  '/lesson/:lessonId/take',
  authenticate,
  authorize('student'),
  quizController.getQuizForStudent
);

// POST /api/quizzes/:quizId/start  — start or resume an attempt
router.post(
  '/:quizId/start',
  authenticate,
  authorize('student'),
  quizController.startAttempt
);

// POST /api/quizzes/attempts/:attemptId/submit  — manual or auto-submit
router.post(
  '/attempts/:attemptId/submit',
  authenticate,
  authorize('student'),
  quizController.submitAttempt
);

// GET /api/quizzes/attempts/:attemptId/result  — view score + correct answers
router.get(
  '/attempts/:attemptId/result',
  authenticate,
  authorize('student'),
  quizController.getAttemptResult
);

module.exports = router;
