// Schema regression: the migrated DB must contain everything the backend code queries.
// Requires DATABASE_URL (test DB). Skipped otherwise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import pg from 'pg';

const url = process.env.DATABASE_URL;
const skip = !url && 'DATABASE_URL not set';

test('no migration contains destructive statements', () => {
  for (const f of fs.readdirSync('database/migrations')) {
    const sql = fs.readFileSync(`database/migrations/${f}`, 'utf8').split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
    assert.ok(!/DROP\s+(SCHEMA|DATABASE)|TRUNCATE/i.test(sql), `${f} must not drop schemas/databases or truncate`);
  }
});

test('every migration file is recorded as applied', { skip }, async () => {
  const pool = new pg.Pool({ connectionString: url });
  try {
    const files = fs.readdirSync('database/migrations').filter(f => f.endsWith('.sql')).sort();
    const rows = (await pool.query('SELECT version FROM public.schema_migrations ORDER BY version')).rows.map(r => r.version);
    assert.deepEqual(rows, files);
  } finally { await pool.end(); }
});

test('columns/tables used by backend code exist (drift guard)', { skip }, async () => {
  const pool = new pg.Pool({ connectionString: url });
  const need = ['tasks.task_type', 'tasks.completed_at', 'tasks.type', 'task_assets.file_data', 'users.is_head_of_department', 'users.failed_login_attempts',
    'attendance_breaks.attendance_id', 'time_entries.userId', 'campaign_weekly_logs.campaignId', 'ad_account_balances.daysRemaining',
    'audit_log.entity_id', 'refresh_tokens.token_hash', 'meetings.google_event_id', 'leave_requests.reporting_manager'];
  try {
    const have = new Set((await pool.query(`SELECT table_name||'.'||column_name AS c FROM information_schema.columns WHERE table_schema='public'`)).rows.map(r => r.c));
    assert.deepEqual(need.filter(n => !have.has(n)), []);
  } finally { await pool.end(); }
});
