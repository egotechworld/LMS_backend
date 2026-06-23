const { pool } = require('./config/database');
const fs = require('fs');

async function test() {
  try {
    const [c] = await pool.query('SELECT * FROM courses WHERE id = 3');
    const [users] = await pool.query('SELECT * FROM users');
    
    // Test the JOIN manually
    let course;
    if (c.length > 0) {
      course = c[0];
      const [u] = await pool.query('SELECT * FROM users WHERE id = ?', [course.instructor_id]);
      course.instructor = u.length > 0 ? u[0] : null;
    }

    fs.writeFileSync('C:\\Users\\charu\\.gemini\\antigravity-ide\\brain\\1b3236a4-3ee3-49c7-a79c-b63b8625f990\\scratch\\test.json', JSON.stringify({ course, users }, null, 2));
  } catch (err) {
    fs.writeFileSync('C:\\Users\\charu\\.gemini\\antigravity-ide\\brain\\1b3236a4-3ee3-49c7-a79c-b63b8625f990\\scratch\\test.json', JSON.stringify({ error: err.message }, null, 2));
  }
}

test();
