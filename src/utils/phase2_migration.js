const { pool } = require('../config/database');

async function runPhase2Migration() {
  const connection = await pool.getConnection();
  try {
    console.log('Starting Phase 2 Migration...');
    await connection.beginTransaction();

    // 1. Create assignments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date TIMESTAMP,
        document_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      );
    `);

    // 2. Create submissions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assignment_id INT,
        student_id INT,
        file_url VARCHAR(255) NOT NULL,
        notes TEXT,
        grade DECIMAL(5,2),
        feedback TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY(assignment_id, student_id)
      );
    `);

    // 3. Create quizzes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT,
        lesson_id INT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        passing_score DECIMAL(5,2) DEFAULT 80.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
      );
    `);

    // 4. Create quiz_questions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quiz_id INT,
        question_text TEXT NOT NULL,
        options JSON NOT NULL,
        correct_option_id VARCHAR(50) NOT NULL,
        order_index INT DEFAULT 0,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
      );
    `);

    // 5. Create quiz_attempts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quiz_id INT,
        student_id INT,
        score DECIMAL(5,2) NOT NULL,
        passed BOOLEAN NOT NULL,
        answers JSON NOT NULL,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await connection.commit();
    console.log('Phase 2 Migration completed successfully.');
  } catch (error) {
    await connection.rollback();
    console.error('Error during Phase 2 Migration:', error);
  } finally {
    connection.release();
  }
}

module.exports = runPhase2Migration;
