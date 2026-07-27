'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarDays, Check, X, Clock } from 'lucide-react';

// Real leave requests straight from public.leave_requests — deliberately not from
// state.leaveRequests, which is mock seed data unrelated to what people actually submit
// from My Profile. Admin/ops see everyone's; everyone else sees only their own (the backend
// decides via canSeeAll rather than the client asking nicely).
interface LeaveRequest {
  id: number;
  user_id: string;
  user_name: string;
  type: string;
  from_date: string;
  to_date: string;
  reason: string;
  reporting_manager: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  department: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  approved: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-500 border-red-500/30',
};

// from_date/to_date come back as full timestamps; only the calendar date is meaningful.
function formatDate(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function inclusiveDays(from: string, to: string): number {
  const a = new Date(from), b = new Date(to);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 1;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}

export default function LeaveRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [canSeeAll, setCanSeeAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/leave-requests`, { credentials: 'include', cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load leave requests');
      const data = await res.json();
      setRequests(data.requests || []);
      setCanSeeAll(!!data.canSeeAll);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Could not load leave requests');
    } finally {
      setLoading(false);
    }
  }, [user, baseUrl]);

  useEffect(() => { load(); }, [load]);

  const decide = async (id: number, status: 'approved' | 'rejected') => {
    setUpdatingId(id);
    try {
      const res = await fetch(`${baseUrl}/api/leave-requests/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        // Patch in place rather than refetching — keeps the row from jumping around
        // under the cursor while someone works through a list of pending requests.
        setRequests(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Could not update that request');
      }
    } catch {
      setError('Could not connect to the server');
    } finally {
      setUpdatingId(null);
    }
  };

  const visible = useMemo(
    () => (filter === 'all' ? requests : requests.filter(r => r.status === filter)),
    [requests, filter]
  );

  const counts = useMemo(() => ({
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }), [requests]);

  return (
    <div className="flex flex-col h-full bg-bg text-text">
      <header className="px-8 py-6 border-b border-border flex justify-between items-center bg-surface sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ fontFamily: 'var(--font-syne-var)' }}>
            Leave Requests
          </h1>
          <p className="text-text-3 text-sm">
            {canSeeAll ? 'All submitted requests across the team' : 'Your submitted leave requests'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold capitalize transition-colors border ${
                filter === f ? 'bg-primary text-white border-primary' : 'bg-surface-2 text-text-2 border-border hover:text-text'
              }`}
            >
              {f} ({counts[f]})
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-[13px] text-red-500">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-16 text-text-3 text-[13px]">Loading leave requests…</div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <CalendarDays className="w-8 h-8 mx-auto mb-3 text-text-3" />
            <p className="text-[14px] font-bold mb-1">No {filter === 'all' ? '' : filter} leave requests</p>
            <p className="text-[13px] text-text-3">
              Requests submitted from My Profile → Request Leave will appear here.
            </p>
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-2 border-b border-border text-text-2">
                  <tr>
                    {canSeeAll && <th className="px-6 py-3 font-semibold">Employee</th>}
                    <th className="px-6 py-3 font-semibold">Type</th>
                    <th className="px-6 py-3 font-semibold">Duration</th>
                    <th className="px-6 py-3 font-semibold">Days</th>
                    <th className="px-6 py-3 font-semibold">Reason</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    {canSeeAll && <th className="px-6 py-3 font-semibold text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map(req => (
                    <tr key={req.id} className="hover:bg-surface-2/50 transition">
                      {canSeeAll && (
                        <td className="px-6 py-4">
                          <div className="font-medium">{req.user_name}</div>
                          {req.department && (
                            <div className="text-[11px] text-text-3 capitalize">{req.department.replace(/_/g, ' ')}</div>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-surface-3 text-text-2 capitalize">
                          {req.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-text-2 whitespace-nowrap">
                        {formatDate(req.from_date)} → {formatDate(req.to_date)}
                      </td>
                      <td className="px-6 py-4 font-medium">{inclusiveDays(req.from_date, req.to_date)}</td>
                      <td className="px-6 py-4 text-text-3 max-w-[280px] truncate" title={req.reason}>{req.reason}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold border capitalize ${STATUS_STYLES[req.status] || ''}`}>
                          {req.status === 'pending' && <Clock className="w-3 h-3" />}
                          {req.status === 'approved' && <Check className="w-3 h-3" />}
                          {req.status === 'rejected' && <X className="w-3 h-3" />}
                          {req.status}
                        </span>
                      </td>
                      {canSeeAll && (
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {req.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                disabled={updatingId === req.id}
                                onClick={() => decide(req.id, 'approved')}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 hover:bg-emerald-500/20 disabled:opacity-40"
                              >
                                Approve
                              </button>
                              <button
                                disabled={updatingId === req.id}
                                onClick={() => decide(req.id, 'rejected')}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-500/10 text-red-500 border border-red-500/25 hover:bg-red-500/20 disabled:opacity-40"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-text-3">Decided</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
