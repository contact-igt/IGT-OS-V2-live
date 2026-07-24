import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.attendance_breaks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        attendance_id UUID REFERENCES public.attendance_logs(id) ON DELETE CASCADE NOT NULL,
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
        break_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        break_end TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Successfully created attendance_breaks table.');
  } catch (error) {
    console.error('Error creating attendance_breaks table:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();
