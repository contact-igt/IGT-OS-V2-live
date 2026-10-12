import dotenv from 'dotenv';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

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

    // seed.sql ships NO usable credentials. Give each seeded account a one-time password
    // (INITIAL_USER_PASSWORD if set, otherwise random per user and printed once). All are forced to change.
    const pending = await client.query("SELECT id, email FROM public.users WHERE password_hash LIKE '!%'");
    for (const u of pending.rows) {
      const pw = process.env.INITIAL_USER_PASSWORD || crypto.randomBytes(12).toString('base64url');
      await client.query(
        'UPDATE public.users SET password_hash = $1, must_change_password = true WHERE id = $2',
        [await bcrypt.hash(pw, 12), u.id]
      );
      if (!process.env.INITIAL_USER_PASSWORD) console.log(`One-time password for ${u.email}: ${pw}`);
    }
    if (pending.rows.length) console.log(`Provisioned ${pending.rows.length} seeded accounts (must change on first login).`);

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
