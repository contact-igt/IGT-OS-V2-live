// Fresh local/test bootstrap: migrate -> seed (only if empty) -> provision one-time passwords.
// Not for production: seed data is fixtures only.
import dotenv from 'dotenv';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { migrate } from './migrate';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not defined in .env file.');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_DB_INIT !== 'yes-i-understand') {
  console.error('Refusing to run db:init with NODE_ENV=production (it seeds fixture accounts). Use db:migrate for schema changes.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function run() {
  console.log('Applying migrations...');
  const applied = await migrate(pool);
  console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Schema already up to date.');

  const client = await pool.connect();
  try {
    const existing = Number((await client.query('SELECT count(*) FROM public.users')).rows[0].count);
    if (existing === 0) {
      console.log('Seeding fixtures...');
      await client.query(fs.readFileSync(path.join(__dirname, '../database/seed.sql'), 'utf8'));
    } else {
      console.log(`Users table has ${existing} rows - seed skipped.`);
    }

    // seed.sql ships NO usable credentials. Give each seeded account a one-time password
    // (INITIAL_USER_PASSWORD if set, otherwise random per user and printed once). All are forced to change.
    const pending = await client.query("SELECT id, email FROM public.users WHERE password_hash LIKE '!%'");
    for (const u of pending.rows) {
      const pw = process.env.INITIAL_USER_PASSWORD || crypto.randomBytes(12).toString('base64url');
      await client.query(
        'UPDATE public.users SET password_hash = $1, must_change_password = true WHERE id = $2',
        [await bcrypt.hash(pw, 12), u.id]
      );
      if (!process.env.INITIAL_USER_PASSWORD) console.log(`One-time password for ${u.email}: ${pw}`);
    }
    if (pending.rows.length) console.log(`Provisioned ${pending.rows.length} seeded accounts (must change on first login).`);
    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e.message); process.exit(1); });
