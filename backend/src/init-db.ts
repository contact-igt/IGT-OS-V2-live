import dotenv from 'dotenv';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not defined in .env file.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function run() {
  console.log('Connecting to PostgreSQL database...');
  const client = await pool.connect();
  try {
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const seedPath = path.join(__dirname, '../database/seed.sql');

    console.log('Reading database setup files...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    console.log('Executing schema.sql...');
    await client.query(schemaSql);
    
    // Add leave_requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id               SERIAL PRIMARY KEY,
        user_id          VARCHAR(100),
        user_name        VARCHAR(200),
        type             VARCHAR(50),
        from_date        DATE,
        to_date          DATE,
        reason           TEXT,
        reporting_manager VARCHAR(200) DEFAULT 'Abhilash B Nair',
        status           VARCHAR(50) DEFAULT 'pending',
        created_at       TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('Schema executed successfully.');

    console.log('Executing seed.sql...');
    await client.query(seedSql);
    console.log('Seed data inserted successfully.');

    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
