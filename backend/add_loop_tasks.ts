import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  // A LoopTask template — the recurring definition. Each due occurrence becomes its own
  // real row in public.tasks (see tasks.recurrence_id below), so history/completion/time
  // logs per occurrence work exactly like any other task, no special-casing needed anywhere
  // else in the app.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.loop_task_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT,
      client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
      category task_category NOT NULL,
      priority task_priority NOT NULL DEFAULT 'medium',
      assigned_to TEXT[] NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL,
      frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'every_15_days', 'monthly')),
      is_active BOOLEAN NOT NULL DEFAULT true,
      -- Due date of the most recently generated occurrence. Drives "is a new one due yet?"
      -- on the next generation pass — never null once at least one occurrence exists.
      last_generated_date DATE,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // ON DELETE SET NULL, not CASCADE: removing or deactivating a template must never delete
  // the task rows it already generated — those are real historical work with their own
  // time logs and completion records.
  await pool.query(`
    ALTER TABLE public.tasks
      ADD COLUMN IF NOT EXISTS recurrence_id UUID REFERENCES public.loop_task_templates(id) ON DELETE SET NULL;
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_id ON public.tasks(recurrence_id);`);

  console.log('loop_task_templates + tasks.recurrence_id ready');
  await pool.end();
})();
