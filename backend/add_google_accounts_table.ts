import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.google_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
      encrypted_access_token BYTEA NOT NULL,
      access_token_iv BYTEA NOT NULL,
      encrypted_refresh_token BYTEA NOT NULL,
      refresh_token_iv BYTEA NOT NULL,
      token_expires_at TIMESTAMPTZ,
      scopes TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  console.log('google_accounts table ready');
  await pool.end();
})();
