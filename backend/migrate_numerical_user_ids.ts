import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const USER_EMAIL_TO_NUMERICAL_ID: Record<string, string> = {
  'sushilathithiyaa@invictusglobaltech.com': '101',
  'contact@invictusglobaltech.com': '102',
  'connect@invictusglobaltech.com': '103',
  'karankumar.igt@gmail.com': '104',
  'naveenraj.igt@gmail.com': '105',
  'iyyappan.igt@gmail.com': '106',
  'veeravel.igt@gmail.com': '107',
  'jashwanth.boddupally.igt@gmail.com': '108',
  'basheerinvictus@gmail.com': '109',
  'praneshkrishnan.igt@gmail.com': '110',
  'aiswarya.saiju.igt@gmail.com': '111',
  'abhilash.igt@gmail.com': '112',
  'rutuja.rajbhar.igt@gmail.com': '113',
  'tania.viquar.igt@gmail.com': '114',
  'dikshitarajpurohit.igt@gmail.com': '115',
  'thariq.dev@gmail.com': '116',
};

async function run() {
  const client = await pool.connect();
  try {
    console.log('Starting migration to compact numerical User IDs (101-116)...');

    // 1. Find and drop ALL foreign key constraints pointing to public.users
    const fkQuery = `
      SELECT tc.table_schema, tc.table_name, tc.constraint_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'users';
    `;

    const fks = await client.query(fkQuery);
    for (const fk of fks.rows) {
      console.log(`Dropping FK constraint ${fk.constraint_name} on table ${fk.table_name}...`);
      await client.query(`ALTER TABLE public."${fk.table_name}" DROP CONSTRAINT IF EXISTS "${fk.constraint_name}"`);
    }

    // Also drop github_installations FK if exists
    await client.query(`ALTER TABLE public.github_installations DROP CONSTRAINT IF EXISTS github_installations_installed_by_fkey`).catch(() => {});

    // 2. Alter column types to TEXT
    const tablesToAlter = [
      ['users', 'id'],
      ['tasks', 'created_by'],
      ['task_assets', 'uploaded_by'],
      ['time_logs', 'user_id'],
      ['audit_logs', 'user_id'],
      ['task_comments', 'user_id'],
      ['client_kpi_snapshots', 'created_by'],
      ['campaigns', 'created_by'],
      ['export_requests', 'requested_by'],
      ['export_requests', 'approved_by'],
      ['notifications', 'user_id'],
      ['notifications', 'actor_id'],
      ['attendance_logs', 'user_id'],
      ['attendance_breaks', 'user_id'],
    ];

    for (const [tbl, col] of tablesToAlter) {
      try {
        await client.query(`ALTER TABLE public."${tbl}" ALTER COLUMN "${col}" TYPE TEXT USING "${col}"::TEXT`);
      } catch (err: any) {
        console.warn(`Could not alter ${tbl}.${col}:`, err.message);
      }
    }

    // 3. Migrate user IDs to numerical IDs (101-116)
    const usersRes = await client.query(`SELECT id, email FROM public.users`);
    console.log(`Found ${usersRes.rows.length} existing users in database.`);

    for (const u of usersRes.rows) {
      const email = (u.email || '').toLowerCase();
      const newId = USER_EMAIL_TO_NUMERICAL_ID[email] || `99${Math.floor(Math.random() * 90) + 10}`;
      const oldId = u.id;

      if (oldId === newId) {
        console.log(`User ${email} already has numerical ID: ${newId}`);
        continue;
      }

      console.log(`Migrating user ${email}: ${oldId} -> ${newId}`);

      await client.query(`UPDATE public.tasks SET created_by = $1 WHERE created_by = $2`, [newId, oldId]);
      await client.query(`UPDATE public.time_logs SET user_id = $1 WHERE user_id = $2`, [newId, oldId]);
      await client.query(`UPDATE public.audit_logs SET user_id = $1 WHERE user_id = $2`, [newId, oldId]);
      await client.query(`UPDATE public.task_comments SET user_id = $1 WHERE user_id = $2`, [newId, oldId]);
      await client.query(`UPDATE public.notifications SET user_id = $1 WHERE user_id = $2`, [newId, oldId]);
      await client.query(`UPDATE public.notifications SET actor_id = $1 WHERE actor_id = $2`, [newId, oldId]);
      await client.query(`UPDATE public.attendance_logs SET user_id = $1 WHERE user_id = $2`, [newId, oldId]);
      await client.query(`UPDATE public.attendance_breaks SET user_id = $1 WHERE user_id = $2`, [newId, oldId]).catch(() => {});
      await client.query(`UPDATE public.users SET id = $1 WHERE id = $2`, [newId, oldId]);
    }

    console.log('Successfully completed numerical User ID migration (101-116)!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

run();
