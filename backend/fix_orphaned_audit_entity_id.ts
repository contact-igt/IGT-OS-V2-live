import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const r = await pool.query(
    `UPDATE public.audit_log SET entity_id = $1 WHERE entity_id = $2 RETURNING id, entity_id, action`,
    ['89a9d9c1-5d9f-44d4-b7a8-8468f58f4d29', 'TSK-CFX2KIJ']
  );
  console.log('updated rows:', JSON.stringify(r.rows, null, 2));
  await pool.end();
})();
