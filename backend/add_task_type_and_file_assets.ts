import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  // 1. Free-text task type. Previously the New Task form had a fixed dropdown whose value
  // was never persisted at all (no column, and AppContext never sent it) — so the selection
  // was lost on the next refresh. Plain TEXT rather than an enum so people can type their
  // own type without needing a migration each time.
  await pool.query(`ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_type TEXT;`);

  // 2. Real file attachments. task_assets already existed for link-style assets; uploaded
  // files store their bytes in file_data and have no external URL, so file_url has to become
  // nullable. Size/mime are recorded for display and for the download response headers.
  await pool.query(`ALTER TABLE public.task_assets ADD COLUMN IF NOT EXISTS file_data BYTEA;`);
  await pool.query(`ALTER TABLE public.task_assets ALTER COLUMN file_url DROP NOT NULL;`);
  // Exactly one of the two shapes: an external link (file_url) or an uploaded file (file_data).
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE public.task_assets
        ADD CONSTRAINT task_assets_link_or_file CHECK (file_url IS NOT NULL OR file_data IS NOT NULL);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);

  console.log('task_type + file-attachment columns ready');
  await pool.end();
})();
