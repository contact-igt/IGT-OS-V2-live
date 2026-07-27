import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  // Records when a task was actually marked done, so completed work can drop off the active
  // boards after a week while the row itself stays in the database as history.
  //
  // updated_at can't serve this purpose: it moves on every edit, so renaming a long-finished
  // task would make it resurface as if it had just been completed.
  await pool.query(`ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;`);

  // Backfill existing done tasks. updated_at is the closest signal available for work that
  // finished before this column existed — imprecise, but it only decides whether something
  // already-completed is past the 7-day window, which for this backlog it comfortably is.
  const res = await pool.query(
    `UPDATE public.tasks SET completed_at = COALESCE(updated_at, created_at)
     WHERE status = 'done' AND completed_at IS NULL
     RETURNING id`
  );

  console.log(`completed_at column ready; backfilled ${res.rowCount} existing done task(s)`);
  await pool.end();
})();
