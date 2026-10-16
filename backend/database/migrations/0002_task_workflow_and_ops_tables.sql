-- 0002: consolidates the historical add_*.ts scripts (all idempotent, additive, non-destructive).
-- User references are VARCHAR(20) to match users.id (see 0001).

-- tasks: workflow columns
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_type TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'task';
DO $$ BEGIN
  ALTER TABLE public.tasks ADD CONSTRAINT tasks_type_check CHECK (type IN ('goal', 'task', 'subtask'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
UPDATE public.tasks SET type = 'subtask' WHERE parent_task_id IS NOT NULL AND type = 'task';
UPDATE public.tasks SET completed_at = COALESCE(updated_at, created_at) WHERE status = 'done' AND completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);

-- task attachments stored inline (metadata + bytes) or by link
ALTER TABLE public.task_assets ADD COLUMN IF NOT EXISTS file_data BYTEA;
ALTER TABLE public.task_assets ALTER COLUMN file_url DROP NOT NULL;
DO $$ BEGIN
  ALTER TABLE public.task_assets ADD CONSTRAINT task_assets_link_or_file CHECK (file_url IS NOT NULL OR file_data IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- attendance breaks
CREATE TABLE IF NOT EXISTS public.attendance_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID REFERENCES public.attendance_logs(id) ON DELETE CASCADE NOT NULL,
  user_id VARCHAR(20) REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  break_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  break_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attendance_breaks_attendance ON public.attendance_breaks(attendance_id);

-- legacy ops tables still read/written by analytics.ts and campaigns.ts (camelCase columns are what the code uses)
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" VARCHAR(20) REFERENCES public.users(id) ON DELETE CASCADE,
  "taskId" UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  "durationMinutes" INTEGER NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);
CREATE TABLE IF NOT EXISTS public.campaign_weekly_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaignId" UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  "userId" VARCHAR(20) REFERENCES public.users(id) ON DELETE CASCADE,
  leads INTEGER,
  spend INTEGER,
  cpl NUMERIC,
  date TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.ad_account_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "clientId" UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  platform TEXT,
  balance NUMERIC,
  "daysRemaining" INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
