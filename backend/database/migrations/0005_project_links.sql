-- 0005: link AI meetings and Delivery change requests to a project (additive).
-- A meeting or change request that points at a project shows on that project's timeline; deleting a project never
-- deletes the meeting or change request (SET NULL). Tasks already carry project_id from 0004.

ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_meetings_project ON public.meetings(project_id);

ALTER TABLE public.change_requests ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.change_requests ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_change_requests_project ON public.change_requests(project_id);
