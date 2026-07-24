import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Straight from the user's own implementation plan — verified against live data
// (105 <-> NaveenRaj already confirmed matching this exact rule: new = 100 + old suffix).
const ID_MAP: [string, string][] = [];
for (let i = 1; i <= 16; i++) {
  const old = `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`;
  ID_MAP.push([old, String(100 + i)]);
}

// Every plain-text column (table, column) that references users.id, found via a full
// information_schema scan of the live DB — broader than the plan's own list, since it
// covers tables added after that plan was written (meetings, google_accounts, page_access,
// app_secrets). page_access.user_id is handled separately below (unique constraint conflict).
const SCALAR_COLUMNS: [string, string][] = [
  ['agency_metrics', 'updated_by'],
  ['app_secrets', 'updated_by'],
  ['architecture_docs', 'uploaded_by'],
  ['attendance_breaks', 'user_id'],
  ['attendance_logs', 'user_id'],
  ['audit_log', 'actor_id'],
  ['audit_logs', 'user_id'],
  ['campaigns', 'created_by'],
  ['client_kpi_snapshots', 'created_by'],
  ['export_requests', 'approved_by'],
  ['export_requests', 'requested_by'],
  ['github_deployments', 'deployed_by'],
  ['google_accounts', 'user_id'],
  ['leave_requests', 'user_id'],
  ['meetings', 'created_by'],
  ['notifications', 'actor_id'],
  ['notifications', 'user_id'],
  ['page_access', 'granted_by'],
  ['strategic_initiatives', 'created_by'],
  ['strategic_initiatives', 'owner_user_id'],
  ['task_assets', 'uploaded_by'],
  ['task_comments', 'user_id'],
  ['tasks', 'created_by'],
  ['time_logs', 'user_id'],
];

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Temp table beats a hand-built VALUES/parameter list for a 16-row mapping used across
    // 25+ UPDATEs — one source of truth, no risk of a parameter-index mistake.
    await client.query('CREATE TEMP TABLE user_id_map (old_id text PRIMARY KEY, new_id text NOT NULL) ON COMMIT DROP');
    for (const [oldId, newId] of ID_MAP) {
      await client.query('INSERT INTO user_id_map (old_id, new_id) VALUES ($1, $2)', [oldId, newId]);
    }

    console.log('--- Scalar columns ---');
    for (const [table, column] of SCALAR_COLUMNS) {
      const r = await client.query(
        `UPDATE public.${table} t SET ${column} = m.new_id
         FROM user_id_map m WHERE t.${column} = m.old_id`
      );
      if ((r.rowCount || 0) > 0) console.log(`${table}.${column}: ${r.rowCount} rows updated`);
    }

    console.log('--- page_access.user_id (unique-constraint aware) ---');
    // Some old-format rows would remap to the exact same (new_id, page_path) as a grant
    // already recreated under the new id after the partial migration — those are now true
    // duplicates, so drop the stale old-format copy before remapping what's left.
    const dedupeResult = await client.query(`
      DELETE FROM public.page_access old
      USING user_id_map m
      WHERE old.user_id = m.old_id
        AND EXISTS (
          SELECT 1 FROM public.page_access newer
          WHERE newer.user_id = m.new_id AND newer.page_path = old.page_path
        )
    `);
    console.log(`page_access: ${dedupeResult.rowCount} redundant old-format grants removed`);

    const pageAccessResult = await client.query(
      `UPDATE public.page_access t SET user_id = m.new_id
       FROM user_id_map m WHERE t.user_id = m.old_id`
    );
    console.log(`page_access.user_id: ${pageAccessResult.rowCount} rows updated`);

    console.log('--- Array column: tasks.assigned_to ---');
    const arrayResult = await client.query(`
      UPDATE public.tasks
      SET assigned_to = ARRAY(
        SELECT COALESCE(m.new_id, elem)
        FROM unnest(assigned_to) AS elem
        LEFT JOIN user_id_map m ON m.old_id = elem
      )
      WHERE EXISTS (
        SELECT 1 FROM unnest(assigned_to) AS elem2 JOIN user_id_map m2 ON m2.old_id = elem2
      )
    `);
    console.log(`tasks.assigned_to: ${arrayResult.rowCount} task rows updated`);

    await client.query('COMMIT');
    console.log('--- Done, committed ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
})();
