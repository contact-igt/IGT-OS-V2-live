import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const UUID_TO_NUMERICAL_ID: Record<string, string> = {
  '00000000-0000-0000-0000-000000000001': '101',
  '00000000-0000-0000-0000-000000000002': '102',
  '00000000-0000-0000-0000-000000000003': '103',
  '00000000-0000-0000-0000-000000000004': '104',
  '00000000-0000-0000-0000-000000000005': '105',
  '00000000-0000-0000-0000-000000000006': '106',
  '00000000-0000-0000-0000-000000000007': '107',
  '00000000-0000-0000-0000-000000000008': '108',
  '00000000-0000-0000-0000-000000000009': '109',
  '00000000-0000-0000-0000-000000000010': '110',
  '00000000-0000-0000-0000-000000000011': '111',
  '00000000-0000-0000-0000-000000000012': '112',
  '00000000-0000-0000-0000-000000000013': '113',
  '00000000-0000-0000-0000-000000000014': '114',
  '00000000-0000-0000-0000-000000000015': '115',
  '00000000-0000-0000-0000-000000000016': '116',
};

async function main() {
  const client = await pool.connect();
  try {
    console.log('1. Altering tasks.assigned_to column type to TEXT[]...');
    await client.query(`ALTER TABLE public.tasks ALTER COLUMN assigned_to TYPE TEXT[] USING assigned_to::text[];`);
    console.log('Successfully altered tasks.assigned_to to TEXT[].');

    console.log('2. Fetching all tasks to update assigned_to elements...');
    const tasksRes = await client.query(`SELECT id, assigned_to FROM public.tasks`);
    console.log(`Found ${tasksRes.rows.length} tasks.`);

    for (const task of tasksRes.rows) {
      if (!task.assigned_to || !Array.isArray(task.assigned_to)) continue;
      
      const newAssignedTo = task.assigned_to.map((id: string) => UUID_TO_NUMERICAL_ID[id] || id);
      const isChanged = JSON.stringify(task.assigned_to) !== JSON.stringify(newAssignedTo);

      if (isChanged) {
        console.log(`Updating task ${task.id} assigned_to:`, task.assigned_to, '->', newAssignedTo);
        await client.query(`UPDATE public.tasks SET assigned_to = $1 WHERE id = $2`, [newAssignedTo, task.id]);
      }
    }

    console.log('3. Verifying updated tasks...');
    const sample = await client.query(`SELECT id, title, created_by, assigned_to FROM public.tasks LIMIT 5`);
    console.log('Sample updated tasks:', sample.rows);

  } catch (err) {
    console.error('Error in fix_tasks_assigned_to:', err);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

main();
