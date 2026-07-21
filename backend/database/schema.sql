-- Cleaned PostgreSQL Schema for IGT OS

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom Enums
CREATE TYPE user_role AS ENUM ('admin', 'ops', 'team', 'viewer');
CREATE TYPE user_department AS ENUM ('bd', 'operations', 'design', 'development', 'video', 'performance_marketing', 'sales');
CREATE TYPE client_category AS ENUM ('eye_care', 'fitness', 'healthcare', 'edtech', 'automotive', 'construction', 'other');
CREATE TYPE contract_status AS ENUM ('active', 'paused', 'churned');
CREATE TYPE task_category AS ENUM ('performance_marketing', 'social_media', 'video_editing', 'web_development', 'design_creative', 'content_writing', 'strategy', 'operations', 'whatsapp_automation', 'seo', 'other');
CREATE TYPE task_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'paused', 'in_review', 'done', 'blocked', 'cancelled');
CREATE TYPE audit_action AS ENUM ('status_changed', 'assigned', 'unassigned', 'timer_started', 'timer_stopped', 'file_uploaded', 'comment_added', 'task_created', 'task_edited', 'marked_done', 'marked_undone', 'priority_changed', 'deadline_changed', 'export_requested', 'export_approved', 'export_downloaded');
CREATE TYPE export_type AS ENUM ('time_report', 'task_report', 'client_report', 'campaign_report', 'full_export');
CREATE TYPE export_status AS ENUM ('pending', 'approved', 'rejected', 'downloaded');
CREATE TYPE deliverable_type AS ENUM ('monthly_recurring', 'one_time', 'campaign');
CREATE TYPE campaign_type AS ENUM ('google', 'meta', 'youtube', 'offline', 'email', 'whatsapp');
CREATE TYPE campaign_status AS ENUM ('planned', 'running', 'paused', 'completed');

-- 1. Users
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'team',
  department user_department,
  password_hash TEXT NOT NULL,       -- Store hashed passwords (e.g., via bcrypt)
  must_change_password BOOLEAN DEFAULT true,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE CHECK (length(short_code) BETWEEN 3 AND 4),
  category client_category NOT NULL,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  monthly_retainer_inr INTEGER DEFAULT 0,
  contract_start_date DATE,
  contract_status contract_status DEFAULT 'active',
  color_hex TEXT,
  logo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  category task_category NOT NULL,
  assigned_to UUID[] DEFAULT '{}', -- Array of user_ids
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  priority task_priority DEFAULT 'medium',
  status task_status DEFAULT 'todo',
  deadline_date DATE,
  deadline_time TIME,
  time_estimate_minutes INTEGER,
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  dependencies UUID[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Task Assets
CREATE TABLE public.task_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Time Logs
CREATE TABLE public.time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Audit Log
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Task Comments
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Client Deliverables
CREATE TABLE public.client_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  deliverable_name TEXT NOT NULL,
  deliverable_type deliverable_type NOT NULL,
  quantity_per_month INTEGER,
  unit TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Client KPI Snapshots
CREATE TABLE public.client_kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL, -- Format: YYYY-MM
  metric_name TEXT NOT NULL,
  metric_value FLOAT NOT NULL,
  metric_unit TEXT,
  benchmark_value FLOAT,
  performance_score INTEGER CHECK (performance_score BETWEEN 1 AND 10),
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Campaigns
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  campaign_name TEXT NOT NULL,
  campaign_type campaign_type NOT NULL,
  start_date DATE,
  end_date DATE,
  budget_inr INTEGER,
  spend_inr INTEGER,
  impressions INTEGER,
  clicks INTEGER,
  leads INTEGER,
  conversions INTEGER,
  cpl_inr FLOAT,
  roas FLOAT,
  status campaign_status DEFAULT 'planned',
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Export Requests
CREATE TABLE public.export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  export_type export_type NOT NULL,
  date_range_start DATE,
  date_range_end DATE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  status export_status DEFAULT 'pending',
  download_token UUID,
  requested_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ,
  watermark_text TEXT
);

-- 12. Invoices
CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'cancelled');
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  amount_inr INTEGER NOT NULL,
  status invoice_status DEFAULT 'draft',
  issue_date DATE,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'assignment',
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);

-- 14. Leave Requests
CREATE TABLE public.leave_requests (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100),
  user_name VARCHAR(200),
  type VARCHAR(50),
  from_date DATE,
  to_date DATE,
  reason TEXT,
  reporting_manager VARCHAR(200) DEFAULT 'Abhilash B Nair',
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Attendance Logs
-- One row per clock-in/out session — a user can have multiple rows per day (e.g. clocking
-- back in after a break), so this is intentionally NOT unique on (user_id, date).
CREATE TABLE public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  status TEXT DEFAULT 'present', -- 'present' | 'late'
  late_return BOOLEAN DEFAULT false, -- true if this session's clock-in came >60min after the previous session's clock-out
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. GitHub App Integration
ALTER TABLE public.users ADD COLUMN github_username TEXT UNIQUE;
ALTER TABLE public.tasks ADD COLUMN display_code TEXT UNIQUE;

CREATE TABLE public.github_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_org TEXT NOT NULL,
  installed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  installed_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE public.github_repos (
  id TEXT PRIMARY KEY,
  installation_id UUID REFERENCES public.github_installations(id) ON DELETE CASCADE NOT NULL,
  repo_name TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id UUID,
  is_tracked BOOLEAN DEFAULT true
);

CREATE TABLE public.github_commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id TEXT REFERENCES public.github_repos(id) ON DELETE CASCADE NOT NULL,
  sha TEXT UNIQUE NOT NULL,
  author_github_username TEXT NOT NULL,
  author_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  committed_at TIMESTAMPTZ NOT NULL,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  files_changed INTEGER DEFAULT 0,
  linked_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL
);

CREATE TABLE public.github_pull_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id TEXT REFERENCES public.github_repos(id) ON DELETE CASCADE NOT NULL,
  pr_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  author_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  opened_at TIMESTAMPTZ NOT NULL,
  merged_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  status TEXT NOT NULL, -- 'open' | 'merged' | 'closed'
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  commits_count INTEGER DEFAULT 0,
  linked_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  UNIQUE (repo_id, pr_number)
);

CREATE TABLE public.github_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id UUID REFERENCES public.github_pull_requests(id) ON DELETE CASCADE NOT NULL,
  reviewer_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  state TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE public.github_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id TEXT REFERENCES public.github_repos(id) ON DELETE CASCADE NOT NULL,
  environment TEXT NOT NULL,
  deployed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deployed_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL
);

-- 17. Social Media Integration (Instagram + YouTube)
CREATE TABLE public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  platform TEXT NOT NULL, -- 'instagram' | 'youtube'
  account_label TEXT NOT NULL,
  platform_user_id TEXT UNIQUE NOT NULL,
  encrypted_access_token BYTEA NOT NULL,
  access_token_iv BYTEA NOT NULL,
  encrypted_refresh_token BYTEA,
  refresh_token_iv BYTEA,
  token_expires_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  latest_posts JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.social_metric_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.social_accounts(id) ON DELETE CASCADE NOT NULL,
  followers INTEGER,
  reach INTEGER,
  views INTEGER,
  watch_time_hours FLOAT,
  engagement_rate FLOAT,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- 18. Agency Metrics & Strategic Initiatives (CEO Overview, manually maintained by admins)
CREATE TABLE public.agency_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_arr NUMERIC,
  agency_health_percent NUMERIC,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.strategic_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  quarter_label TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 19. Page Access Grants (admin-granted, additive access to pages beyond role defaults)
CREATE TABLE public.page_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  page_path TEXT NOT NULL,
  granted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, page_path)
);


-- 20. Architecture Docs (admin-uploaded frontend.md / backend.md, read-only for everyone else)
CREATE TABLE public.architecture_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type TEXT NOT NULL CHECK (doc_type IN ('frontend', 'backend')) UNIQUE,
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- 21. Audit Log (task/attendance action history — previously an in-memory-only frontend
-- concept that never survived a reload; now persisted so it's a real audit trail)
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_ref TEXT NOT NULL,
  entity_id TEXT, -- stable id (e.g. task.id) so renaming the entity doesn't orphan its history
  client_name TEXT,
  meta TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
