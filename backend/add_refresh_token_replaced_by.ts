import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  // Tracks the rotation chain so /api/auth/refresh can survive two near-simultaneous
  // requests presenting the same (about-to-be-rotated) refresh token — e.g. two tabs open,
  // or the browser retrying a slow request. Without this, whichever request loses the race
  // hits an already-revoked token and gets hard-logged-out even though its session was
  // never actually compromised.
  await pool.query(`
    ALTER TABLE public.refresh_tokens
      ADD COLUMN IF NOT EXISTS replaced_by UUID REFERENCES public.refresh_tokens(id);
  `);
  console.log('refresh_tokens.replaced_by ready');
  await pool.end();
})();
