import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  // Goal / task / subtask. The frontend has modelled this all along, but it was never
  // persisted — so a goal survived only until the next fetch, at which point AppContext's
  // `type: t.type || 'task'` quietly turned it back into an ordinary task and the Goals
  // view showed nothing. Plain TEXT with a CHECK rather than an enum, so the set can be
  // extended without a type migration.
  await pool.query(`
    ALTER TABLE public.tasks
      ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'task';
  `);
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE public.tasks
        ADD CONSTRAINT tasks_type_check CHECK (type IN ('goal', 'task', 'subtask'));
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);

  // Anything already carrying a parent is a subtask by definition.
  const fixed = await pool.query(
    `UPDATE public.tasks SET type = 'subtask'
     WHERE parent_task_id IS NOT NULL AND type = 'task' RETURNING id`
  );

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);`);

  console.log(`tasks.type ready; marked ${fixed.rowCount} existing child task(s) as subtasks`);
  await pool.end();
})();
