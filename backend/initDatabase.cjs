
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
  await connection.query(`USE \`${process.env.DB_NAME}\``);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL,
      name VARCHAR(50) NOT NULL,
      email VARCHAR(100),
      password VARCHAR(255) NOT NULL,
      center VARCHAR(50),
      center_manager VARCHAR(50),
      recommender_id VARCHAR(50),
      recommender_name VARCHAR(50),
      sponsor_id VARCHAR(50),
      sponsor_name VARCHAR(50),
      phone VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("✅ Database and users table created!");
  await connection.end();
}

main().catch(err => {
  console.error("❌ Error initializing database:", err);
});
