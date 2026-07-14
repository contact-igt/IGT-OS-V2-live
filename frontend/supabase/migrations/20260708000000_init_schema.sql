-- Custom Enums
CREATE TYPE user_role AS ENUM ('admin', 'ops', 'team', 'viewer');
CREATE TYPE user_department AS ENUM ('bd', 'operations', 'design', 'development', 'video', 'performance_marketing', 'sales');
CREATE TYPE client_category AS ENUM ('eye_care', 'fitness', 'healthcare', 'edtech', 'automotive', 'construction', 'other');
CREATE TYPE contract_status AS ENUM ('active', 'paused', 'churned');
CREATE TYPE task_category AS ENUM ('performance_marketing', 'social_media', 'video_editing', 'web_development', 'design_creative', 'content_writing', 'strategy', 'operations', 'whatsapp_automation', 'other');
CREATE TYPE task_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'in_review', 'done', 'blocked', 'cancelled');
CREATE TYPE audit_action AS ENUM ('status_changed', 'assigned', 'unassigned', 'timer_started', 'timer_stopped', 'file_uploaded', 'comment_added', 'task_created', 'task_edited', 'marked_done', 'marked_undone', 'priority_changed', 'deadline_changed', 'export_requested', 'export_approved', 'export_downloaded');
CREATE TYPE export_type AS ENUM ('time_report', 'task_report', 'client_report', 'campaign_report', 'full_export');
CREATE TYPE export_status AS ENUM ('pending', 'approved', 'rejected', 'downloaded');
CREATE TYPE deliverable_type AS ENUM ('monthly_recurring', 'one_time', 'campaign');
CREATE TYPE campaign_type AS ENUM ('google', 'meta', 'youtube', 'offline', 'email', 'whatsapp');
CREATE TYPE campaign_status AS ENUM ('planned', 'running', 'paused', 'completed');

-- 4.1 Users (Profiles mapped to auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'team',
  department user_department,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create a trigger to automatically create a user profile when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', 'New User'), new.email, COALESCE((new.raw_user_meta_data->>'role')::user_role, 'team'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 4.2 Clients
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

-- 4.3 Tasks
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

-- 4.4 Task Assets
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

-- 4.5 Time Logs
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

-- 4.6 Audit Log
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

-- 4.7 Task Comments
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.8 Client Deliverables
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

-- 4.9 Client KPI Snapshots
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

-- 4.10 Campaigns
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

-- 4.11 Export Requests
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
