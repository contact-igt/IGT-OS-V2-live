import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS active_timers (
      "userId" UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
      "taskId" UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
      "startedAt" TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS time_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" UUID REFERENCES public.users(id) ON DELETE CASCADE,
      "taskId" UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
      "durationMinutes" INTEGER NOT NULL,
      date TIMESTAMPTZ DEFAULT NOW(),
      note TEXT
    );
    CREATE TABLE IF NOT EXISTS campaign_weekly_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "campaignId" UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
      "userId" UUID REFERENCES public.users(id) ON DELETE CASCADE,
      "leads" INTEGER,
      "spend" INTEGER,
      "cpl" NUMERIC,
      date TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ad_account_balances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "clientId" UUID REFERENCES public.clients(id) ON DELETE CASCADE,
      platform TEXT,
      balance NUMERIC,
      "daysRemaining" INTEGER,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('Tables added');
  process.exit(0);
}
run();
