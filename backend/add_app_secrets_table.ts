import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.app_secrets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key_name TEXT NOT NULL UNIQUE,
      encrypted_value BYTEA NOT NULL,
      value_iv BYTEA NOT NULL,
      updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  console.log('app_secrets table ready');
  await pool.end();
})();
