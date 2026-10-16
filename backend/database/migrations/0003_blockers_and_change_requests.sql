-- 0003: structured blockers + client change requests (additive).

CREATE TABLE IF NOT EXISTS public.blockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  blocking_party TEXT NOT NULL CHECK (blocking_party IN ('client', 'internal', 'vendor', 'platform', 'other')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  owner_id VARCHAR(20) REFERENCES public.users(id) ON DELETE SET NULL,
  escalation_owner_id VARCHAR(20) REFERENCES public.users(id) ON DELETE SET NULL,
  expected_resolution DATE,
  next_action TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_by VARCHAR(20) REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(20) REFERENCES public.users(id) ON DELETE SET NULL,
  resolution_note TEXT
);
CREATE INDEX IF NOT EXISTS idx_blockers_status ON public.blockers(status);
CREATE INDEX IF NOT EXISTS idx_blockers_task ON public.blockers(task_id);

CREATE TABLE IF NOT EXISTS public.change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_name TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'other' CHECK (source IN ('whatsapp', 'email', 'call', 'meeting', 'portal', 'other')),
  requested_by TEXT,
  received_at DATE NOT NULL DEFAULT CURRENT_DATE,
  classification TEXT NOT NULL CHECK (classification IN ('bug', 'content_change', 'design_change', 'new_feature', 'integration_change', 'scope_change', 'production_issue')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  scope_impact TEXT,
  timeline_impact_days INTEGER,
  commercial_impact_inr INTEGER,
  technical_risk TEXT CHECK (technical_risk IN ('low', 'medium', 'high')),
  recommended_decision TEXT CHECK (recommended_decision IN ('accept', 'reject', 'defer')),
  recommended_by VARCHAR(20) REFERENCES public.users(id) ON DELETE SET NULL,
  decision TEXT NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending', 'accepted', 'rejected', 'deferred')),
  decided_by VARCHAR(20) REFERENCES public.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  roadmap_bucket TEXT NOT NULL DEFAULT 'none' CHECK (roadmap_bucket IN ('none', 'now', 'next', 'later')),
  linked_task_ids UUID[] NOT NULL DEFAULT '{}',
  created_by VARCHAR(20) REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_change_requests_client ON public.change_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_decision ON public.change_requests(decision);
