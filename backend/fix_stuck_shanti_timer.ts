import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const r = await pool.query(
    `UPDATE public.time_logs
     SET ended_at = NOW(), duration_minutes = FLOOR(EXTRACT(EPOCH FROM (NOW() - started_at)) / 60)
     WHERE id = '7824d0a1-92d1-4104-b896-a7e567565009' AND ended_at IS NULL
     RETURNING id, task_id, started_at, ended_at, duration_minutes`
  );
  console.log('closed:', JSON.stringify(r.rows, null, 2));
  await pool.end();
})();
