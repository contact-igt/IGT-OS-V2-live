'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface ProjectLite { id: string; name: string; client_id: string; client_name: string; status: string; lead_id: string | null }

// One shared, short-lived cache per signed-in user, so several components on a page (filter, drawer, new-task form)
// cost one request, and a different user in the same tab never sees the previous user's list.
const TTL_MS = 15_000;
let cache: { userId: string; at: number; data: ProjectLite[] } | null = null;
let inflight: { userId: string; promise: Promise<ProjectLite[]> } | null = null;

async function fetchProjects(userId: string, force: boolean): Promise<ProjectLite[]> {
  if (!force && cache && cache.userId === userId && Date.now() - cache.at < TTL_MS) return cache.data;
  if (!force && inflight && inflight.userId === userId) return inflight.promise;
  const promise = (async () => {
    try {
      const res = await fetch(`${baseUrl}/api/projects`, { credentials: 'include' });
      const data: ProjectLite[] = res.ok ? await res.json() : [];
      cache = { userId, at: Date.now(), data };
      return data;
    } catch { return []; } finally { inflight = null; }
  })();
  inflight = { userId, promise };
  return promise;
}

// Call after creating or changing a project so pickers do not serve a stale list.
export function invalidateProjects() { cache = null; }

// Projects the signed-in user may attach work to (staff see all, others the ones they lead or have a task on).
export function useProjects() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const load = useCallback(async (force = false) => {
    if (!userId) { setProjects([]); return; }
    setProjects(await fetchProjects(userId, force));
  }, [userId]);
  useEffect(() => { load(); }, [load]);
  return { projects, reload: () => load(true) };
}

// Closed projects are hidden from pickers unless one is the current value.
export const isOpenProject = (p: Pick<ProjectLite, 'status'>) => p.status !== 'completed' && p.status !== 'cancelled';
