import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function run() {
  await pool.query(`
    ALTER TABLE IF EXISTS public.audit_log ADD COLUMN IF NOT EXISTS entity_id TEXT;
  `);
  console.log('audit_log.entity_id column ready');
  process.exit(0);
}
run();
