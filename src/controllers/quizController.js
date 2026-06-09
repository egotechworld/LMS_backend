const quizService = require('../services/quizService');
const asyncHandler = require('../utils/asyncHandler');
const { validationResult } = require('express-validator');

class QuizController {
  // ── Quiz CRUD (instructor) ───────────────────────────────────────────────

  createQuiz = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { lessonId, courseId, title, timeLimitMinutes, allowRetake } = req.body;
    const quiz = await quizService.createQuiz(req.user.id, {
      lessonId: parseInt(lessonId),
      courseId: parseInt(courseId),
      title,
      timeLimitMinutes: timeLimitMinutes ? parseInt(timeLimitMinutes) : 0,
      allowRetake: !!allowRetake,
    });

    res.status(201).json({ success: true, message: 'Quiz created', data: quiz });
  });

  updateQuiz = asyncHandler(async (req, res) => {
    const quiz = await quizService.updateQuiz(
      parseInt(req.params.id),
      req.user.id,
      req.body
    );
    res.json({ success: true, message: 'Quiz updated', data: quiz });
  });

  deleteQuiz = asyncHandler(async (req, res) => {
    await quizService.deleteQuiz(parseInt(req.params.id), req.user.id);
    res.json({ success: true, message: 'Quiz deleted' });
  });

  getQuizByLesson = asyncHandler(async (req, res) => {
    const quiz = await quizService.getQuizByLesson(parseInt(req.params.lessonId));
    res.json({ success: true, data: quiz });
  });

  getQuizzesByCourse = asyncHandler(async (req, res) => {
    const quizzes = await quizService.getQuizzesByCourse(parseInt(req.params.courseId));
    res.json({ success: true, data: quizzes });
  });

  // ── Questions (instructor) ────────────────────────────────────────────────

  addQuestion = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const question = await quizService.addQuestion(
      req.user.id,
      parseInt(req.params.quizId),
      req.body
    );
    res.status(201).json({ success: true, message: 'Question added', data: question });
  });

  deleteQuestion = asyncHandler(async (req, res) => {
    await quizService.deleteQuestion(req.user.id, parseInt(req.params.questionId));
    res.json({ success: true, message: 'Question deleted' });
  });

  getQuestionsForInstructor = asyncHandler(async (req, res) => {
    const questions = await quizService.getQuestionsForInstructor(
      req.user.id,
      parseInt(req.params.quizId)
    );
    res.json({ success: true, data: questions });
  });

  getQuizResults = asyncHandler(async (req, res) => {
    const results = await quizService.getQuizResults(req.user.id, parseInt(req.params.quizId));
    res.json({ success: true, data: results });
  });

  // ── Student quiz flow ─────────────────────────────────────────────────────

  /**
   * GET /api/quizzes/lesson/:lessonId/student
   * Returns quiz + questions (no correct answers) if lesson is completed.
   */
  getQuizForStudent = asyncHandler(async (req, res) => {
    const data = await quizService.getQuizForStudent(
      req.user.id,
      parseInt(req.params.lessonId)
    );
    res.json({ success: true, data });
  });

  /**
   * POST /api/quizzes/:quizId/start
   * Starts (or resumes) an attempt. Returns attemptId + time info for the timer.
   */
  startAttempt = asyncHandler(async (req, res) => {
    const data = await quizService.startAttempt(req.user.id, parseInt(req.params.quizId));
    res.status(201).json({ success: true, data });
  });

  /**
   * POST /api/quizzes/attempts/:attemptId/submit
   * Body: { answers: [{ questionId, selectedOption }] }
   * Works for both manual submit and auto-submit (time-up).
   */
  submitAttempt = asyncHandler(async (req, res) => {
    const { answers } = req.body;
    const result = await quizService.submitAttempt(
      req.user.id,
      parseInt(req.params.attemptId),
      answers || []
    );
    res.json({ success: true, message: 'Quiz submitted', data: result });
  });

  /**
   * GET /api/quizzes/attempts/:attemptId/result
   * Returns score, total, and per-question breakdown with correct answers.
   */
  getAttemptResult = asyncHandler(async (req, res) => {
    const result = await quizService.getAttemptResult(
      req.user.id,
      parseInt(req.params.attemptId)
    );
    res.json({ success: true, data: result });
  });
}

module.exports = new QuizController();
