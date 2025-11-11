import { Pool } from 'pg';

// Create a PostgreSQL connection pool
const pool = new Pool({
  user: 'your_user', // replace with your database username
  host: 'localhost', // replace with your database host
  database: 'your_database', // replace with your database name
  password: 'your_password', // replace with your database password
  port: 5432, // replace with your database port
});

// Initialize the database schema
async function initSchema() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS users (\n      id SERIAL PRIMARY KEY,\n      username VARCHAR(100) NOT NULL UNIQUE,\n      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n    );`);
  } finally {
    client.release();
  }
}

// Call the schema initialization function
initSchema().catch((err) => console.error('Error initializing schema', err));

export default pool;
