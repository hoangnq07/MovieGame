const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Render sẽ cung cấp
  ssl: { rejectUnauthorized: false } // Quan trọng khi deploy trên Render
});

module.exports = pool;