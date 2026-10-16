// Ordered SQL migrations with a tracking table. The ONLY supported schema path.
//   npm run db:migrate -w backend                 apply pending migrations
//   npm run db:migrate -w backend -- --baseline-existing   mark 0001 as applied on a DB that already has the baseline
// Never run against production without review: migrations are additive but this tool is not a deploy mechanism.
import dotenv from 'dotenv';
import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';

dotenv.config();

const DIR = path.join(__dirname, '../database/migrations');

export async function migrate(pool: Pool, opts: { baselineExisting?: boolean } = {}): Promise<string[]> {
  const client: PoolClient = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    const done = new Set((await client.query('SELECT version FROM public.schema_migrations')).rows.map(r => r.version));
    const files = fs.readdirSync(DIR).filter(f => /^\d{4}_.+\.sql$/.test(f)).sort();

    for (const file of files) {
      if (done.has(file)) continue;
      if (opts.baselineExisting && file.startsWith('0001_')) {
        await client.query('INSERT INTO public.schema_migrations (version) VALUES ($1)', [file]);
        applied.push(`${file} (marked applied, not executed)`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(fs.readFileSync(path.join(DIR, file), 'utf8'));
        await client.query('INSERT INTO public.schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
      }
    }
  } finally {
    client.release();
  }
  return applied;
}

if (require.main === module) {
  if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set'); process.exit(1); }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
  migrate(pool, { baselineExisting: process.argv.includes('--baseline-existing') })
    .then(a => { console.log(a.length ? `Applied:\n  ${a.join('\n  ')}` : 'Database is up to date.'); return pool.end(); })
    .catch(e => { console.error(e.message); process.exit(1); });
}
