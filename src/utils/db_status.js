require('dotenv').config();
const { pool } = require('../config/database');

(async () => {
  const [tables] = await pool.query(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ?
     ORDER BY TABLE_NAME`,
    [process.env.DB_NAME]
  );
  const [counts] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM users) AS users,
       (SELECT COUNT(*) FROM courses) AS courses,
       (SELECT COUNT(*) FROM enrollments) AS enrollments,
       (SELECT COUNT(*) FROM assignments) AS assignments,
       (SELECT COUNT(*) FROM quizzes) AS quizzes,
       (SELECT COUNT(*) FROM notifications) AS notifications,
       (SELECT COUNT(*) FROM orders) AS orders`
  );

  console.log(JSON.stringify({
    tables: tables.map((row) => row.TABLE_NAME),
    counts: counts[0],
  }, null, 2));
  await pool.end();
})().catch((error) => {
  console.error(`Database status failed: ${error.message}`);
  process.exit(1);
});
