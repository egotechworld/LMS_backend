const { pool } = require('../config/database');

async function checkUsers() {
  try {
    const [users] = await pool.execute('SELECT id, email, first_name, role FROM users');
    console.log('Users in database:', users);
  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    process.exit();
  }
}

checkUsers();
