import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// The people who were "isHeadOfDepartment: true" in the old static mock roster
// (frontend/src/lib/data.ts) — carried over to real accounts so self-assign-approval
// bypass and department-head notification routing (AppContext.tsx's
// getTaskDepartmentHeadIds) work against real backend users again.
const HEAD_EMAILS = [
  'sushilathithiyaa@invictusglobaltech.com', // CEO
  'contact@invictusglobaltech.com',          // COO
  'connect@invictusglobaltech.com',          // Operations Manager
  'karankumar.igt@gmail.com',                // Creative Head — Design
  'basheerinvictus@gmail.com',               // Creative Head — Video
  'naveenraj.igt@gmail.com',                 // Head of Development
];

(async () => {
  await pool.query(`
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_head_of_department BOOLEAN NOT NULL DEFAULT false;
  `);
  const result = await pool.query(
    `UPDATE public.users SET is_head_of_department = true WHERE LOWER(email) = ANY($1) RETURNING name, email`,
    [HEAD_EMAILS.map(e => e.toLowerCase())]
  );
  console.log('is_head_of_department column ready. Marked as heads:', result.rows.map(r => r.name));
  await pool.end();
})();
