'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Star, TrendingUp, Users, Activity, ArrowUpRight, DollarSign, Briefcase, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AgencyMetrics {
  monthlyArr: number | null;
  agencyHealthPercent: number | null;
}

interface Initiative {
  id: string;
  name: string;
  progressPercent: number;
  quarterLabel: string | null;
  owner: { id: string; name: string } | null;
}

interface RosterUser {
  id: string;
  name: string;
}

function formatArr(value: number | null): string {
  if (value === null) return 'Not set';
  return `₹${value.toLocaleString('en-IN')}`;
}

export default function CeoDashboardPage() {
  const { user } = useAuth();
  const { state } = useApp();
  const router = useRouter();

  const [metrics, setMetrics] = useState<AgencyMetrics>({ monthlyArr: null, agencyHealthPercent: null });
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [roster, setRoster] = useState<RosterUser[]>([]);

  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
  const [metricsForm, setMetricsForm] = useState({ monthlyArr: '', agencyHealthPercent: '' });
  const [metricsSaving, setMetricsSaving] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const [isInitiativeModalOpen, setIsInitiativeModalOpen] = useState(false);
  const [editingInitiativeId, setEditingInitiativeId] = useState<string | null>(null);
  const [initiativeForm, setInitiativeForm] = useState({ name: '', ownerUserId: '', progressPercent: '0', quarterLabel: '' });
  const [initiativeSaving, setInitiativeSaving] = useState(false);
  const [initiativeError, setInitiativeError] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('invictus_jwt')}`,
  });

  const loadData = async () => {
    const [metricsRes, initiativesRes, usersRes] = await Promise.all([
      fetch(`${baseUrl}/api/agency-metrics`, { headers: authHeaders() }),
      fetch(`${baseUrl}/api/agency-metrics/initiatives`, { headers: authHeaders() }),
      fetch(`${baseUrl}/api/users`, { headers: authHeaders() }),
    ]);
    if (metricsRes.ok) setMetrics(await metricsRes.json());
    if (initiativesRes.ok) setInitiatives(await initiativesRes.json());
    if (usersRes.ok) setRoster(await usersRes.json());
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return <div className="p-8 text-center text-red-500">Access Denied: CEO Only</div>;
  }

  const openMetricsModal = () => {
    setMetricsForm({
      monthlyArr: metrics.monthlyArr === null ? '' : String(metrics.monthlyArr),
      agencyHealthPercent: metrics.agencyHealthPercent === null ? '' : String(metrics.agencyHealthPercent),
    });
    setMetricsError(null);
    setIsMetricsModalOpen(true);
  };

  const handleSaveMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    setMetricsSaving(true);
    setMetricsError(null);
    try {
      const res = await fetch(`${baseUrl}/api/agency-metrics`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          monthlyArr: metricsForm.monthlyArr.trim() === '' ? null : Number(metricsForm.monthlyArr),
          agencyHealthPercent: metricsForm.agencyHealthPercent.trim() === '' ? null : Number(metricsForm.agencyHealthPercent),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMetricsError(data.error || 'Failed to save');
        return;
      }
      setMetrics(data);
      setIsMetricsModalOpen(false);
    } catch {
      setMetricsError('Failed to save');
    } finally {
      setMetricsSaving(false);
    }
  };

  const openAddInitiativeModal = () => {
    setEditingInitiativeId(null);
    setInitiativeForm({ name: '', ownerUserId: '', progressPercent: '0', quarterLabel: '' });
    setInitiativeError(null);
    setIsInitiativeModalOpen(true);
  };

  const openEditInitiativeModal = (initiative: Initiative) => {
    setEditingInitiativeId(initiative.id);
    setInitiativeForm({
      name: initiative.name,
      ownerUserId: initiative.owner?.id || '',
      progressPercent: String(initiative.progressPercent),
      quarterLabel: initiative.quarterLabel || '',
    });
    setInitiativeError(null);
    setIsInitiativeModalOpen(true);
  };

  const handleSaveInitiative = async (e: React.FormEvent) => {
    e.preventDefault();
    setInitiativeSaving(true);
    setInitiativeError(null);
    try {
      const body = {
        name: initiativeForm.name.trim(),
        ownerUserId: initiativeForm.ownerUserId || null,
        progressPercent: Number(initiativeForm.progressPercent),
        quarterLabel: initiativeForm.quarterLabel.trim() || null,
      };
      const res = await fetch(
        `${baseUrl}/api/agency-metrics/initiatives${editingInitiativeId ? `/${editingInitiativeId}` : ''}`,
        { method: editingInitiativeId ? 'PATCH' : 'POST', headers: authHeaders(), body: JSON.stringify(body) }
      );
      const data = await res.json();
      if (!res.ok) {
        setInitiativeError(data.error || 'Failed to save');
        return;
      }
      setIsInitiativeModalOpen(false);
      await loadData();
    } catch {
      setInitiativeError('Failed to save');
    } finally {
      setInitiativeSaving(false);
    }
  };

  const handleDeleteInitiative = async (id: string) => {
    if (!confirm('Delete this strategic initiative? This cannot be undone.')) return;
    const res = await fetch(`${baseUrl}/api/agency-metrics/initiatives/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) setInitiatives(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-syne text-app-text mb-2">CEO Overview</h1>
          <p className="text-app-text2">Welcome back, {user.name}. Here's the high-level agency status.</p>
        </div>
        <button onClick={() => router.push('/dashboard')} className="bg-app-surface2 border border-app-border px-4 py-2 rounded-lg text-sm font-bold hover:bg-app-surface transition-colors flex items-center gap-2">
          View Detailed Agency Ops <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* High Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-app-surface border border-app-border rounded-xl p-6 relative group">
          <button onClick={openMetricsModal} className="absolute top-4 right-4 text-app-text3 hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
            <Pencil className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-sm font-bold text-app-text2">Monthly ARR</div>
          </div>
          <div className={`text-3xl font-bold font-syne mb-2 ${metrics.monthlyArr === null ? 'text-app-text3' : 'text-app-text'}`}>
            {formatArr(metrics.monthlyArr)}
          </div>
          {metrics.monthlyArr === null && (
            <button onClick={openMetricsModal} className="text-xs text-primary font-bold hover:underline">+ Add</button>
          )}
        </div>
        <div className="bg-app-surface border border-app-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-sm font-bold text-app-text2">Active Clients</div>
          </div>
          <div className="text-3xl font-bold font-syne text-app-text mb-2">{state.clients.length}</div>
        </div>
        <div className="bg-app-surface border border-app-border rounded-xl p-6 relative group">
          <button onClick={openMetricsModal} className="absolute top-4 right-4 text-app-text3 hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
            <Pencil className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-sm font-bold text-app-text2">Agency Health</div>
          </div>
          <div className={`text-3xl font-bold font-syne mb-2 ${metrics.agencyHealthPercent === null ? 'text-app-text3' : 'text-app-text'}`}>
            {metrics.agencyHealthPercent === null ? 'Not set' : `${metrics.agencyHealthPercent}%`}
          </div>
          {metrics.agencyHealthPercent === null && (
            <button onClick={openMetricsModal} className="text-xs text-primary font-bold hover:underline">+ Add</button>
          )}
        </div>
        <div className="bg-app-surface border border-app-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-sm font-bold text-app-text2">Team Size</div>
          </div>
          <div className="text-3xl font-bold font-syne text-app-text mb-2">{state.teamMembers.length}</div>
        </div>
      </div>

      {/* Strategic Initiatives */}
      <div className="bg-app-surface border border-app-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold font-syne flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" /> Strategic Initiatives
          </h2>
          <button onClick={openAddInitiativeModal} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus className="w-4 h-4" /> Add Initiative
          </button>
        </div>
        {initiatives.length === 0 ? (
          <p className="text-center text-app-text3 text-sm py-8">No strategic initiatives yet — add one to start tracking.</p>
        ) : (
          <div className="space-y-4">
            {initiatives.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-app-surface2 rounded-lg border border-app-border group">
                <div>
                  <div className="font-bold text-app-text mb-1">{item.name}{item.quarterLabel ? ` · ${item.quarterLabel}` : ''}</div>
                  <div className="text-xs text-app-text3">Owner: {item.owner?.name || 'Unassigned'}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-4 w-64">
                    <div className="flex-1 h-2 bg-app-surface rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${item.progressPercent}%` }}></div>
                    </div>
                    <span className="text-xs font-bold w-8 text-right">{item.progressPercent}%</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditInitiativeModal(item)} className="p-1.5 text-app-text3 hover:text-primary transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteInitiative(item.id)} className="p-1.5 text-app-text3 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isMetricsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-app-surface2 border border-app-border rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-app-border bg-app-surface">
              <h3 className="font-bold text-base text-app-text">Edit Agency Metrics</h3>
              <button onClick={() => setIsMetricsModalOpen(false)} className="text-app-text3 hover:text-app-text transition-colors">✕</button>
            </div>
            <form onSubmit={handleSaveMetrics} className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-app-text3">Monthly ARR (₹)</label>
                <input
                  type="number"
                  className="input-base"
                  placeholder="e.g. 1200000"
                  value={metricsForm.monthlyArr}
                  onChange={e => setMetricsForm({ ...metricsForm, monthlyArr: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-app-text3">Agency Health (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="input-base"
                  placeholder="e.g. 98"
                  value={metricsForm.agencyHealthPercent}
                  onChange={e => setMetricsForm({ ...metricsForm, agencyHealthPercent: e.target.value })}
                />
              </div>
              {metricsError && <p className="text-xs text-red-400">{metricsError}</p>}
              <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-app-border">
                <button type="button" onClick={() => setIsMetricsModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary disabled:opacity-60" disabled={metricsSaving}>
                  {metricsSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isInitiativeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-app-surface2 border border-app-border rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-app-border bg-app-surface">
              <h3 className="font-bold text-base text-app-text">{editingInitiativeId ? 'Edit' : 'Add'} Strategic Initiative</h3>
              <button onClick={() => setIsInitiativeModalOpen(false)} className="text-app-text3 hover:text-app-text transition-colors">✕</button>
            </div>
            <form onSubmit={handleSaveInitiative} className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-app-text3">Name</label>
                <input
                  type="text"
                  className="input-base"
                  placeholder="e.g. Launch AI-Driven Ad Buying"
                  value={initiativeForm.name}
                  onChange={e => setInitiativeForm({ ...initiativeForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-app-text3">Owner</label>
                <select
                  className="input-base"
                  value={initiativeForm.ownerUserId}
                  onChange={e => setInitiativeForm({ ...initiativeForm, ownerUserId: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {roster.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-app-text3">Progress (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="input-base"
                  value={initiativeForm.progressPercent}
                  onChange={e => setInitiativeForm({ ...initiativeForm, progressPercent: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-app-text3">Quarter <span className="normal-case font-normal">(optional)</span></label>
                <input
                  type="text"
                  className="input-base"
                  placeholder="e.g. Q3 2026"
                  value={initiativeForm.quarterLabel}
                  onChange={e => setInitiativeForm({ ...initiativeForm, quarterLabel: e.target.value })}
                />
              </div>
              {initiativeError && <p className="text-xs text-red-400">{initiativeError}</p>}
              <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-app-border">
                <button type="button" onClick={() => setIsInitiativeModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary disabled:opacity-60" disabled={initiativeSaving}>
                  {initiativeSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
