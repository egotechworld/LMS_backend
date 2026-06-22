const mysql = require('mysql2/promise');
require('dotenv').config();

async function alterTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lms_db'
  });

  try {
    console.log('Adding columns to courses table...');
    
    // Check and add level
    try {
      await connection.query('ALTER TABLE courses ADD COLUMN level VARCHAR(50) DEFAULT "beginner"');
      console.log('Added level column');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') console.error(e.message);
    }

    // Check and add duration
    try {
      await connection.query('ALTER TABLE courses ADD COLUMN duration INT DEFAULT 0');
      console.log('Added duration column');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') console.error(e.message);
    }

    // Check and add thumbnail
    try {
      await connection.query('ALTER TABLE courses ADD COLUMN thumbnail VARCHAR(255) NULL');
      console.log('Added thumbnail column');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') console.error(e.message);
    }

    console.log('Migration complete');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

alterTable();
