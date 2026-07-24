import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'meetings_google_event_id_key'
      ) THEN
        ALTER TABLE public.meetings ADD CONSTRAINT meetings_google_event_id_key UNIQUE (google_event_id);
      END IF;
    END $$;
  `);
  console.log('meetings.google_event_id unique constraint ready');
  await pool.end();
})();
