'use client';

import { useState } from 'react';
import { useProjects, isOpenProject } from '@/lib/useProjects';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Links an analysed meeting to one of its client's projects, so it shows on that project's timeline and tasks created
// from it can join the project. The server enforces who may do this (owner/staff who are also on the project).
export default function MeetingProjectLink({ meetingId, clientId, projectId, onChanged }: {
  meetingId: string; clientId: string | null; projectId: string | null; onChanged: (projectId: string | null) => void;
}) {
  const { projects } = useProjects();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!clientId) {
    return <p className="text-[12px]" style={{ color: 'var(--c-text-3)' }}>This meeting has no client yet, so it cannot be linked to a project.</p>;
  }
  const options = projects.filter(p => p.client_id === clientId && (isOpenProject(p) || p.id === projectId));
  if (options.length === 0 && !projectId) {
    return <p className="text-[12px]" style={{ color: 'var(--c-text-3)' }}>No open projects for this client that you can link to.</p>;
  }

  const change = async (next: string) => {
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/meetings/${meetingId}/project`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: next || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
      onChanged(next || null);
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: 'var(--c-text-2)' }}>
        Project
        <select aria-label="Link meeting to project" className="input-base !py-1 !text-[12px] !w-auto" disabled={saving} value={projectId || ''} onChange={e => change(e.target.value)}>
          <option value="">Not linked</option>
          {options.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      {error && <span role="alert" className="text-[12px]" style={{ color: 'var(--c-error)' }}>{error}</span>}
    </div>
  );
}
