const mysql = require('mysql2/promise');

const retries = Number(process.env.DB_WAIT_RETRIES || 30);
const delayMs = Number(process.env.DB_WAIT_DELAY_MS || 2000);

const config = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

async function waitForDb() {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const connection = await mysql.createConnection(config);
      await connection.query('SELECT 1');
      await connection.end();
      console.log('MySQL is ready');
      return;
    } catch (error) {
      console.log(`Waiting for MySQL (${attempt}/${retries}): ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.error('MySQL did not become ready in time');
  process.exit(1);
}

waitForDb();
