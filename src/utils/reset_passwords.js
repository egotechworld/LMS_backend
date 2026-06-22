const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function resetPasswords() {
  try {
    const adminHash = await bcrypt.hash('admin123', 10);
    const testHash = await bcrypt.hash('test1234', 10);

    // Insert or update Admin
    await pool.execute(
      `INSERT INTO users (email, password, first_name, last_name, role) 
       VALUES ('admin@lms.com', ?, 'Admin', 'User', 'admin')
       ON DUPLICATE KEY UPDATE password = ?`,
      [adminHash, adminHash]
    );

    // Insert or update Instructor
    await pool.execute(
      `INSERT INTO users (email, password, first_name, last_name, role) 
       VALUES ('instructor@lms.com', ?, 'John', 'Instructor', 'instructor')
       ON DUPLICATE KEY UPDATE password = ?`,
      [testHash, testHash]
    );

    // Insert or update Student
    await pool.execute(
      `INSERT INTO users (email, password, first_name, last_name, role) 
       VALUES ('student@lms.com', ?, 'Jane', 'Student', 'student')
       ON DUPLICATE KEY UPDATE password = ?`,
      [testHash, testHash]
    );

    console.log('Passwords have been reset successfully!');
    console.log('Admin: admin@lms.com / admin123');
    console.log('Instructor: instructor@lms.com / test1234');
    console.log('Student: student@lms.com / test1234');
  } catch (error) {
    console.error('Error resetting passwords:', error);
  } finally {
    process.exit();
  }
}

resetPasswords();
