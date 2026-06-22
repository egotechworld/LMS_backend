const { pool } = require('../config/database');

async function alterLessonProgress() {
  try {
    console.log('Altering lesson_progress table...');
    await pool.query(`
      ALTER TABLE lesson_progress
      ADD COLUMN course_id INT NOT NULL AFTER lesson_id,
      ADD FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
    `);
    console.log('✅ lesson_progress table altered successfully');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ course_id already exists in lesson_progress');
    } else {
      console.error('❌ Alter failed:', error);
    }
  }
}

module.exports = alterLessonProgress;
