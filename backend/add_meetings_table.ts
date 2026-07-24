import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.meetings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
      created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
      transcript_snippet TEXT,
      analysis_preference TEXT,
      result JSONB NOT NULL,
      tasks_created UUID[] DEFAULT '{}',
      google_event_id TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  console.log('meetings table ready');
  await pool.end();
})();
