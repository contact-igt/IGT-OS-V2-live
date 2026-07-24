import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    await pool.query(`
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';
    `);
    console.log('users.color column added successfully');
  } catch (err) {
    console.error('Error adding users.color column:', err);
  } finally {
    await pool.end();
  }
})();
