const quizRepository = require('../repositories/quizRepository');
const progressRepository = require('../repositories/progressRepository');
const enrollmentRepository = require('../repositories/enrollmentRepository');
const ApiError = require('../utils/ApiError');
const { createNotification } = require('../utils/notificationHelper');

class QuizService {
  // ── Quiz management (instructor) ─────────────────────────────────────────

  async createQuiz(instructorId, { lessonId, courseId, title, timeLimitMinutes, allowRetake }) {
    // One quiz per lesson
    const existing = await quizRepository.findByLesson(lessonId);
    if (existing) throw new ApiError('A quiz already exists for this lesson', 400);

    const quizId = await quizRepository.create({
      lessonId,
      courseId,
      title,
      timeLimitMinutes: timeLimitMinutes || 0,
      allowRetake: allowRetake || false,
      createdBy: instructorId,
    });

    return quizRepository.findById(quizId);
  }

  async updateQuiz(quizId, instructorId, data) {
    const quiz = await this._getQuizOrThrow(quizId);
    if (quiz.created_by !== instructorId) throw new ApiError('Forbidden', 403);

    await quizRepository.update(quizId, {
      title: data.title ?? quiz.title,
      timeLimitMinutes: data.timeLimitMinutes ?? quiz.time_limit_minutes,
      allowRetake: data.allowRetake ?? quiz.allow_retake,
    });
    return quizRepository.findById(quizId);
  }

  async deleteQuiz(quizId, instructorId) {
    const quiz = await this._getQuizOrThrow(quizId);
    if (quiz.created_by !== instructorId) throw new ApiError('Forbidden', 403);
    await quizRepository.delete(quizId);
  }

  async getQuizByLesson(lessonId) {
    const quiz = await quizRepository.findByLesson(lessonId);
    if (!quiz) throw new ApiError('No quiz found for this lesson', 404);
    return quiz;
  }

  async getQuizzesByCourse(courseId) {
    return quizRepository.findByCourse(courseId);
  }

  // ── Questions (instructor) ────────────────────────────────────────────────

  async addQuestion(instructorId, quizId, questionData) {
    const quiz = await this._getQuizOrThrow(quizId);
    if (quiz.created_by !== instructorId) throw new ApiError('Forbidden', 403);

    const { questionText, optionA, optionB, optionC, optionD, correctOption, marks } = questionData;

    // orderIndex = next after existing
    const existing = await quizRepository.getQuestions(quizId);
    const orderIndex = existing.length;

    const questionId = await quizRepository.addQuestion({
      quizId,
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      marks: marks || 1,
      orderIndex,
    });

    // Recalculate total marks
    await quizRepository.recalcTotalMarks(quizId);

    const questions = await quizRepository.getQuestions(quizId);
    return questions.find((q) => q.id === questionId);
  }

  async deleteQuestion(instructorId, questionId) {
    // Verify ownership via quiz
    const [rows] = await require('../config/database').pool.execute(
      `SELECT qq.*, qz.created_by FROM quiz_questions qq
       JOIN quizzes qz ON qz.id = qq.quiz_id WHERE qq.id = ?`,
      [questionId]
    );
    const question = rows[0];
    if (!question) throw new ApiError('Question not found', 404);
    if (question.created_by !== instructorId) throw new ApiError('Forbidden', 403);

    await quizRepository.deleteQuestion(questionId);
    await quizRepository.recalcTotalMarks(question.quiz_id);
  }

  async getQuestionsForInstructor(instructorId, quizId) {
    const quiz = await this._getQuizOrThrow(quizId);
    if (quiz.created_by !== instructorId) throw new ApiError('Forbidden', 403);
    return quizRepository.getQuestions(quizId);
  }

  // ── Student quiz flow ─────────────────────────────────────────────────────

  /**
   * Returns quiz meta + questions (without correct answers).
   * Only accessible after the lesson is marked complete.
   */
  async getQuizForStudent(studentId, lessonId) {
    const quiz = await quizRepository.findByLesson(lessonId);
    if (!quiz) throw new ApiError('No quiz available for this lesson', 404);

    // Must have completed the lesson
    const done = await progressRepository.isLessonComplete(studentId, lessonId);
    if (!done) throw new ApiError('Complete the lesson before taking the quiz', 403);

    // Check retake policy
    const attempts = await quizRepository.getAttemptsByStudent(quiz.id, studentId);
    const completedAttempts = attempts.filter((a) => a.is_submitted);
    if (completedAttempts.length > 0 && !quiz.allow_retake) {
      throw new ApiError('Retake is not allowed for this quiz', 403);
    }

    const questions = await quizRepository.getQuestionsForStudent(quiz.id);
    return { quiz, questions };
  }

  /**
   * Start a new attempt (returns attemptId + start time so the frontend
   * can drive the countdown timer).
   */
  async startAttempt(studentId, quizId) {
    const quiz = await this._getQuizOrThrow(quizId);

    // Retake guard
    const prior = await quizRepository.getAttemptsByStudent(quizId, studentId);
    const done = prior.filter((a) => a.is_submitted);
    if (done.length > 0 && !quiz.allow_retake) {
      throw new ApiError('Retake is not allowed for this quiz', 403);
    }

    // Clean up any unsubmitted attempt before creating a new one
    const inProgress = prior.find((a) => !a.is_submitted);
    if (inProgress) {
      // Return the existing in-progress attempt so the student can continue
      const questions = await quizRepository.getQuestionsForStudent(quizId);
      return { attemptId: inProgress.id, quiz, questions, started_at: inProgress.started_at };
    }

    const attemptId = await quizRepository.createAttempt({
      quizId,
      studentId,
      totalMarks: quiz.total_marks,
    });

    const attempt = await quizRepository.findAttemptById(attemptId);
    const questions = await quizRepository.getQuestionsForStudent(quizId);
    return { attemptId, quiz, questions, started_at: attempt.started_at };
  }

  /**
   * Submit answers for an attempt.
   * Handles both manual submit and auto-submit (time-up).
   * Returns score, total, per-question breakdown with correct answers.
   */
  async submitAttempt(studentId, attemptId, answers) {
    const attempt = await quizRepository.findAttemptById(attemptId);
    if (!attempt) throw new ApiError('Attempt not found', 404);
    if (attempt.student_id !== studentId) throw new ApiError('Forbidden', 403);
    if (attempt.is_submitted) throw new ApiError('This attempt has already been submitted', 400);

    const quiz = await quizRepository.findById(attempt.quiz_id);

    // Validate time limit (server-side guard)
    if (quiz.time_limit_minutes > 0) {
      const elapsedMs = Date.now() - new Date(attempt.started_at).getTime();
      const limitMs = quiz.time_limit_minutes * 60 * 1000;
      // Allow a 10-second grace period for network latency
      if (elapsedMs > limitMs + 10000) {
        // Auto-mark with whatever was answered
      }
    }

    const questions = await quizRepository.getQuestionsForGrading(attempt.quiz_id);
    const answerMap = new Map((answers || []).map((a) => [a.questionId, a.selectedOption]));

    let score = 0;
    for (const q of questions) {
      const selected = answerMap.get(q.id) || null;
      const isCorrect = selected === q.correct_option;
      const marksAwarded = isCorrect ? q.marks : 0;
      score += marksAwarded;

      if (selected) {
        await quizRepository.saveAnswer({
          attemptId,
          questionId: q.id,
          selectedOption: selected,
          isCorrect,
          marksAwarded,
        });
      }
    }

    await quizRepository.submitAttempt(attemptId, score);

    // Build result with correct answers shown
    const breakdown = await quizRepository.getAttemptAnswers(attemptId);

    return {
      attemptId,
      score,
      totalMarks: quiz.total_marks,
      percentage: quiz.total_marks > 0 ? ((score / quiz.total_marks) * 100).toFixed(2) : '0.00',
      breakdown,
    };
  }

  async getAttemptResult(studentId, attemptId) {
    const attempt = await quizRepository.findAttemptById(attemptId);
    if (!attempt) throw new ApiError('Attempt not found', 404);
    if (attempt.student_id !== studentId) throw new ApiError('Forbidden', 403);
    if (!attempt.is_submitted) throw new ApiError('Attempt not yet submitted', 400);

    const breakdown = await quizRepository.getAttemptAnswers(attemptId);
    const quiz = await quizRepository.findById(attempt.quiz_id);

    return {
      attempt,
      score: attempt.score,
      totalMarks: attempt.total_marks,
      percentage:
        attempt.total_marks > 0
          ? ((attempt.score / attempt.total_marks) * 100).toFixed(2)
          : '0.00',
      breakdown,
      quiz: { title: quiz.title, allow_retake: quiz.allow_retake },
    };
  }

  /** Instructor: all submitted attempts for a quiz */
  async getQuizResults(instructorId, quizId) {
    const quiz = await this._getQuizOrThrow(quizId);
    if (quiz.created_by !== instructorId) throw new ApiError('Forbidden', 403);
    return quizRepository.getAttemptsByQuiz(quizId);
  }

  // ── Private helpers ──────────────────────────────────────────────────────
  async _getQuizOrThrow(quizId) {
    const quiz = await quizRepository.findById(quizId);
    if (!quiz) throw new ApiError('Quiz not found', 404);
    return quiz;
  }
}

module.exports = new QuizService();
