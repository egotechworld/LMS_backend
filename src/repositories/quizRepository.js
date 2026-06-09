const { pool } = require('../config/database');

class QuizRepository {
  // ── Quiz CRUD ────────────────────────────────────────────────────────────
  async create({ lessonId, courseId, title, timeLimitMinutes, allowRetake, createdBy }) {
    const [result] = await pool.execute(
      `INSERT INTO quizzes
         (lesson_id, course_id, title, time_limit_minutes, allow_retake, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [lessonId, courseId, title, timeLimitMinutes || 0, allowRetake ? 1 : 0, createdBy]
    );
    return result.insertId;
  }

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT q.*,
              l.title AS lesson_title,
              c.title AS course_title
       FROM quizzes q
       JOIN lessons l ON q.lesson_id = l.id
       JOIN courses c ON q.course_id = c.id
       WHERE q.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async findByLesson(lessonId) {
    const [rows] = await pool.execute(
      `SELECT * FROM quizzes WHERE lesson_id = ?`,
      [lessonId]
    );
    return rows[0] || null;
  }

  async findByCourse(courseId) {
    const [rows] = await pool.execute(
      `SELECT q.*, l.title AS lesson_title
       FROM quizzes q
       JOIN lessons l ON q.lesson_id = l.id
       WHERE q.course_id = ?
       ORDER BY l.order_index`,
      [courseId]
    );
    return rows;
  }

  async update(id, { title, timeLimitMinutes, allowRetake }) {
    await pool.execute(
      `UPDATE quizzes SET title = ?, time_limit_minutes = ?, allow_retake = ?, updated_at = NOW()
       WHERE id = ?`,
      [title, timeLimitMinutes, allowRetake ? 1 : 0, id]
    );
  }

  async updateTotalMarks(id, totalMarks) {
    await pool.execute(`UPDATE quizzes SET total_marks = ? WHERE id = ?`, [totalMarks, id]);
  }

  async delete(id) {
    await pool.execute(`DELETE FROM quizzes WHERE id = ?`, [id]);
  }

  // ── Questions ────────────────────────────────────────────────────────────
  async addQuestion({ quizId, questionText, optionA, optionB, optionC, optionD, correctOption, marks, orderIndex }) {
    const [result] = await pool.execute(
      `INSERT INTO quiz_questions
         (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, order_index)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [quizId, questionText, optionA, optionB, optionC, optionD, correctOption, marks || 1, orderIndex || 0]
    );
    return result.insertId;
  }

  async getQuestions(quizId) {
    const [rows] = await pool.execute(
      `SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index, id`,
      [quizId]
    );
    return rows;
  }

  /** Returns questions WITH correct_option exposed — for grading only, not student-facing */
  async getQuestionsForGrading(quizId) {
    return this.getQuestions(quizId);
  }

  /**
   * Returns questions in a RANDOM order — safe to send to students.
   * correct_option is intentionally excluded; grading uses getQuestionsForGrading().
   * Question order is randomised per call (each student gets a different sequence).
   */
  async getQuestionsForStudent(quizId) {
    const [rows] = await pool.execute(
      `SELECT id, quiz_id, question_text, option_a, option_b, option_c, option_d, marks
       FROM quiz_questions WHERE quiz_id = ? ORDER BY RAND()`,
      [quizId]
    );
    return rows;
  }

  async deleteQuestion(questionId) {
    await pool.execute(`DELETE FROM quiz_questions WHERE id = ?`, [questionId]);
  }

  async recalcTotalMarks(quizId) {
    const [[{ total }]] = await pool.execute(
      `SELECT COALESCE(SUM(marks), 0) AS total FROM quiz_questions WHERE quiz_id = ?`,
      [quizId]
    );
    await this.updateTotalMarks(quizId, total);
    return total;
  }

  // ── Attempts ─────────────────────────────────────────────────────────────
  async createAttempt({ quizId, studentId, totalMarks, optionMaps }) {
    const [result] = await pool.execute(
      `INSERT INTO quiz_attempts (quiz_id, student_id, total_marks, option_maps)
       VALUES (?, ?, ?, ?)`,
      [quizId, studentId, totalMarks, JSON.stringify(optionMaps || {})]
    );
    return result.insertId;
  }

  async findAttemptById(attemptId) {
    const [rows] = await pool.execute(
      `SELECT * FROM quiz_attempts WHERE id = ?`,
      [attemptId]
    );
    if (!rows[0]) return null;
    // Parse JSON column back to object
    const attempt = rows[0];
    attempt.option_maps =
      typeof attempt.option_maps === 'string'
        ? JSON.parse(attempt.option_maps)
        : attempt.option_maps || {};
    return attempt;
  }

  async getAttemptsByStudent(quizId, studentId) {
    const [rows] = await pool.execute(
      `SELECT * FROM quiz_attempts
       WHERE quiz_id = ? AND student_id = ?
       ORDER BY started_at DESC`,
      [quizId, studentId]
    );
    return rows;
  }

  async getAttemptsByQuiz(quizId) {
    const [rows] = await pool.execute(
      `SELECT qa.*, u.first_name, u.last_name, u.email
       FROM quiz_attempts qa
       JOIN users u ON qa.student_id = u.id
       WHERE qa.quiz_id = ? AND qa.is_submitted = 1
       ORDER BY qa.submitted_at DESC`,
      [quizId]
    );
    return rows;
  }

  async submitAttempt(attemptId, score) {
    await pool.execute(
      `UPDATE quiz_attempts
       SET score = ?, is_submitted = 1, submitted_at = NOW()
       WHERE id = ?`,
      [score, attemptId]
    );
  }

  // ── Attempt answers ───────────────────────────────────────────────────────
  async saveAnswer({ attemptId, questionId, selectedOption, isCorrect, marksAwarded }) {
    await pool.execute(
      `INSERT INTO quiz_attempt_answers
         (attempt_id, question_id, selected_option, is_correct, marks_awarded)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         selected_option = VALUES(selected_option),
         is_correct = VALUES(is_correct),
         marks_awarded = VALUES(marks_awarded)`,
      [attemptId, questionId, selectedOption, isCorrect ? 1 : 0, marksAwarded]
    );
  }

  async getAttemptAnswers(attemptId) {
    const [rows] = await pool.execute(
      `SELECT aa.*, qq.question_text, qq.option_a, qq.option_b, qq.option_c, qq.option_d,
              qq.correct_option, qq.marks
       FROM quiz_attempt_answers aa
       JOIN quiz_questions qq ON aa.question_id = qq.id
       WHERE aa.attempt_id = ?
       ORDER BY qq.order_index, qq.id`,
      [attemptId]
    );
    return rows;
  }
}

module.exports = new QuizRepository();
