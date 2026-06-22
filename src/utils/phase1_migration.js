const { pool } = require('../config/database');

async function runPhase1Migration() {
  try {
    console.log('Running Phase 1 Migrations...');

    // 1. Lessons Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        video_url VARCHAR(255),
        audio_url VARCHAR(255),
        document_url VARCHAR(255),
        order_index INT DEFAULT 0,
        is_published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ lessons table created/verified');

    // 2. Lesson Files Table (Centralized file management)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lesson_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        instructor_id INT NOT NULL,
        lesson_id INT NULL, -- Can be null if just uploaded to repository
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        file_type ENUM('video', 'audio', 'document') NOT NULL,
        file_size INT NOT NULL, -- in bytes
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ lesson_files table created/verified');

    // 3. Lesson Progress Table (Student tracking)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lesson_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        lesson_id INT NOT NULL,
        is_completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
        UNIQUE KEY unique_student_lesson (student_id, lesson_id)
      )
    `);
    console.log('✅ lesson_progress table created/verified');

    console.log('🎉 Phase 1 Migrations complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

module.exports = runPhase1Migration;
