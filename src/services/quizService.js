const quizRepository = require('../repositories/quizRepository');
const progressRepository = require('../repositories/progressRepository');
const enrollmentRepository = require('../repositories/enrollmentRepository');
const ApiError = require('../utils/ApiError');
const { createNotification } = require('../utils/notificationHelper');
const { buildShuffledQuiz } = require('../utils/shuffleQuiz');
const courseRepository = require('../repositories/courseRepository');
const lessonRepository = require('../repositories/lessonRepository');

class QuizService {
  // ── Quiz management (instructor) ─────────────────────────────────────────

  async createQuiz(instructorId, { lessonId, courseId, title, timeLimitMinutes, allowRetake }) {
    const course = await courseRepository.findById(courseId);
    const lesson = await lessonRepository.findById(lessonId);
    if (!course || !lesson || Number(lesson.course_id) !== Number(courseId)) {
      throw new ApiError('Lesson does not belong to this course', 400, 'LESSON_COURSE_MISMATCH');
    }
    if (Number(course.instructor_id) !== Number(instructorId)) {
      throw new ApiError('You do not own this course', 403, 'COURSE_OWNERSHIP_REQUIRED');
    }
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
   * Returns quiz meta + questions (without correct answers, options shuffled).
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

    // Fetch raw questions (randomised order from DB via ORDER BY RAND())
    const rawQuestions = await quizRepository.getQuestionsForStudent(quiz.id);

    // Shuffle option positions — each call produces a different layout
    const { questions } = buildShuffledQuiz(rawQuestions);

    return { quiz, questions };
  }

  /**
   * Start a new attempt.
   * Questions are randomised (order + option positions) and the option map
   * is persisted in the attempt row so grading can translate display keys
   * back to the original DB keys.
   */
  async startAttempt(studentId, quizId) {
    const quiz = await this._getQuizOrThrow(quizId);
    const enrollment = await enrollmentRepository.findByStudentAndCourse(studentId, quiz.course_id);
    if (!enrollment) throw new ApiError('You are not enrolled in this course', 403, 'ENROLLMENT_REQUIRED');
    const lessonComplete = await progressRepository.isLessonComplete(studentId, quiz.lesson_id);
    if (!lessonComplete) {
      throw new ApiError('Complete the lesson before taking the quiz', 403, 'LESSON_COMPLETION_REQUIRED');
    }

    // Retake guard
    const prior = await quizRepository.getAttemptsByStudent(quizId, studentId);
    const done = prior.filter((a) => a.is_submitted);
    if (done.length > 0 && !quiz.allow_retake) {
      throw new ApiError('Retake is not allowed for this quiz', 403);
    }

    // Resume existing in-progress attempt — return the same shuffled questions
    const inProgress = prior.find((a) => !a.is_submitted);
    if (inProgress) {
      const rawQuestions = await quizRepository.getQuestionsForStudent(quizId);
      // Re-apply the STORED option maps so the student sees the same layout on resume
      const { questions } = _applyStoredOptionMaps(rawQuestions, inProgress.option_maps);
      return {
        attemptId: inProgress.id,
        quiz,
        questions,
        started_at: inProgress.started_at,
        time_limit_minutes: quiz.time_limit_minutes,
      };
    }

    // New attempt — randomise question order + option positions
    const rawQuestions = await quizRepository.getQuestionsForStudent(quizId);
    const { questions, optionMaps } = buildShuffledQuiz(rawQuestions);

    const attemptId = await quizRepository.createAttempt({
      quizId,
      studentId,
      totalMarks: quiz.total_marks,
      optionMaps,
    });

    const attempt = await quizRepository.findAttemptById(attemptId);

    return {
      attemptId,
      quiz,
      questions,
      started_at: attempt.started_at,
      time_limit_minutes: quiz.time_limit_minutes,
    };
  }

  /**
   * Submit answers for an attempt.
   * Translates display keys (a/b/c/d as shown to student) back to original
   * DB keys using the stored option_maps before auto-marking.
   */
  async submitAttempt(studentId, attemptId, answers) {
    const attempt = await quizRepository.findAttemptById(attemptId);
    if (!attempt) throw new ApiError('Attempt not found', 404);
    if (attempt.student_id !== studentId) throw new ApiError('Forbidden', 403);
    if (attempt.is_submitted) throw new ApiError('This attempt has already been submitted', 400);

    const quiz = await quizRepository.findById(attempt.quiz_id);

    // Server-side time guard (10-second grace window for network latency)
    if (quiz.time_limit_minutes > 0) {
      const elapsedMs = Date.now() - new Date(attempt.started_at).getTime();
      const limitMs = quiz.time_limit_minutes * 60 * 1000;
      if (elapsedMs > limitMs + 10_000) {
        // Time expired — auto-submit with whatever answers were provided
      }
    }

    // Fetch questions WITH correct answers for grading
    const questions = await quizRepository.getQuestionsForGrading(attempt.quiz_id);

    // Build a lookup: questionId → displaySelectedOption
    const displayAnswerMap = new Map(
      (answers || []).map((a) => [Number(a.questionId), a.selectedOption])
    );

    const optionMaps = attempt.option_maps || {};
    let score = 0;

    for (const q of questions) {
      const displaySelected = displayAnswerMap.get(q.id) || null;

      // Translate display key → original DB key using the stored map
      const originalSelected = displaySelected
        ? (optionMaps[q.id]?.[displaySelected] ?? displaySelected)
        : null;

      const isCorrect = originalSelected !== null && originalSelected === q.correct_option;
      const marksAwarded = isCorrect ? q.marks : 0;
      score += marksAwarded;

      if (originalSelected) {
        await quizRepository.saveAnswer({
          attemptId,
          questionId: q.id,
          selectedOption: originalSelected, // store original key, not display key
          isCorrect,
          marksAwarded,
        });
      }
    }

    await quizRepository.submitAttempt(attemptId, score);

    // Full breakdown with correct answers for immediate review
    const breakdown = await quizRepository.getAttemptAnswers(attemptId);

    return {
      attemptId,
      score,
      totalMarks: quiz.total_marks,
      percentage:
        quiz.total_marks > 0 ? ((score / quiz.total_marks) * 100).toFixed(2) : '0.00',
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

/**
 * Re-apply a previously stored optionMaps to a set of raw questions
 * so a resuming student sees exactly the same option layout as before.
 *
 * @param {object[]} rawQuestions  from getQuestionsForStudent()
 * @param {object}   optionMaps   stored in attempt.option_maps
 * @returns {{ questions: object[] }}
 */
function _applyStoredOptionMaps(rawQuestions, optionMaps) {
  const questions = rawQuestions.map((q) => {
    const map = optionMaps[q.id];
    if (!map) {
      // Fallback: no map stored (e.g. legacy row) — return as-is without correct_option
      return {
        id: q.id,
        quiz_id: q.quiz_id,
        question_text: q.question_text,
        marks: q.marks,
        displayOptions: [
          { key: 'a', text: q.option_a },
          { key: 'b', text: q.option_b },
          { key: 'c', text: q.option_c },
          { key: 'd', text: q.option_d },
        ],
      };
    }

    // Invert map: originalKey → displayKey
    const invertedMap = {};
    Object.entries(map).forEach(([dk, ok]) => { invertedMap[ok] = dk; });

    const optionTexts = { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d };
    const displayOptions = ['a', 'b', 'c', 'd'].map((displayKey) => {
      const originalKey = map[displayKey];
      return { key: displayKey, text: optionTexts[originalKey] };
    });

    return {
      id: q.id,
      quiz_id: q.quiz_id,
      question_text: q.question_text,
      marks: q.marks,
      displayOptions,
    };
  });

  return { questions };
}

module.exports = new QuizService();
