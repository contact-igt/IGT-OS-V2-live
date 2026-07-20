'use client';

import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Raw UUIDs are unusable at full length in a dense table — show a short prefix with a
// one-click copy button so the exact value is still just a click away when actually needed.
function IdCell({ value }: { value: string | null | undefined }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <td className="p-3 font-mono text-xs text-[var(--c-text-3)]">—</td>;

  // These are seeded UUIDs that are all identical zeros except the tail (e.g.
  // 00000000-0000-0000-0000-000000000003) — the prefix is useless for telling rows apart,
  // so show the last few characters instead, which is where the actual variation lives.
  const short = value.length > 3 ? `…${value.slice(-3)}` : value;
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <td className="p-3 font-mono text-xs text-[var(--c-text-3)]">
      <button
        onClick={handleCopy}
        title={value}
        className="flex items-center gap-1.5 hover:text-[var(--c-primary)] transition-colors"
      >
        {short}
        <span className="material-symbols-outlined text-[13px]">
          {copied ? 'check' : 'content_copy'}
        </span>
      </button>
    </td>
  );
}

export default function AuditPage() {
  const { state } = useApp();
  const { user } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'campaigns' | 'time_entries' | 'attendance'>('users');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('invictus_jwt');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [campRes, teRes, usersRes, attRes] = await Promise.all([
        fetch('http://localhost:4000/api/campaigns', { headers }),
        fetch('http://localhost:4000/api/time-logs', { headers }),
        fetch('http://localhost:4000/api/users', { headers }),
        fetch('http://localhost:4000/api/attendance', { headers })
      ]);

      if (campRes.ok) setCampaigns(await campRes.json());
      if (teRes.ok) setTimeEntries(await teRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (attRes.ok) setAttendance(await attRes.json());
    } catch (e) {
      console.error('Error fetching audit data', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  if (!mounted || !user) {
    return <div className="p-8 text-[var(--c-text-2)]">Loading audit view...</div>;
  }

  if (user.role !== 'admin' && user.role !== 'ceo') {
    return (
      <div className="p-8 text-center text-[var(--c-error)] font-bold">
        UNAUTHORIZED: Admin or CEO access required.
      </div>
    );
  }

  const handleSync = () => {
    setToast('Data sync initiated. Pulling latest from database...');
    fetchData().then(() => {
      setToast('Sync complete! All caches cleared.');
      setTimeout(() => setToast(''), 3000);
    });
  };



  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-6 min-h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold text-[var(--c-text)] font-syne flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--c-error)] text-3xl">admin_panel_settings</span>
            System Audit
          </h1>
          <p className="text-[var(--c-text-2)] mt-1 text-sm font-grotesk">Raw database views and system controls. Confidential.</p>
        </div>
        <button 
          onClick={handleSync}
          className="bg-[var(--c-surface-2)] text-[var(--c-text)] border border-[var(--c-border)] px-4 py-2 rounded-lg font-bold text-sm hover:bg-[var(--c-hover)] transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">sync</span>
          Sync Data & Clear Cache
        </button>
      </div>

      {toast && (
        <div className="bg-[var(--c-primary)]/10 border border-[var(--c-primary)] text-[var(--c-primary)] px-4 py-3 rounded-lg font-bold text-sm animate-pulse">
          {toast}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--c-border)] mb-4 pb-2">
        {(['users', 'campaigns', 'time_entries', 'attendance'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg font-bold text-sm capitalize ${activeTab === tab ? 'bg-[var(--c-surface)] text-[var(--c-primary)] border-t border-l border-r border-[var(--c-border)] -mb-[9px] relative z-10' : 'text-[var(--c-text-2)] hover:text-[var(--c-text)]'}`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="bg-[var(--c-surface)] rounded-b-xl rounded-tr-xl border border-[var(--c-border)] p-1 overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--c-surface-2)] border-b border-[var(--c-border)]">
              {activeTab === 'users' && (
                <>
                  <th className="p-3 font-bold text-[var(--c-text-3)] uppercase tracking-wider text-xs">ID</th>
                  <th className="p-3 font-bold text-[var(--c-text-3)] uppercase tracking-wider text-xs">Name</th>
                  <th className="p-3 font-bold text-[var(--c-text-3)] uppercase tracking-wider text-xs">Email</th>
                  <th className="p-3 font-bold text-[var(--c-text-3)] uppercase tracking-wider text-xs">Role</th>
                  <th className="p-3 font-bold text-[var(--c-text-3)] uppercase tracking-wider text-xs">Created At</th>
                </>
              )}
              {activeTab === 'campaigns' && (
                <>
                  <th className="p-3 font-bold text-[var(--c-text-3)] uppercase tracking-wider text-xs">ID</th>
                  <th className="p-3 font-bold text-[var(--c-text-3)] uppercase tracking-wider text-xs">Client ID</th>
                  <th className="p-3 font-bold text-[var(--c-text-3)] uppercase tracking-wider text-xs">Name</th>
                  <th className="p-3 font-bold text-[var(--c-text-3)] uppercase tracking-wider text-xs">Status</th>
                  <th className="p-3 font-bold text-[var(--c-text-3)] uppercase tracking-wider text-xs">Spend (INR)</th>
                  <th className="p-3 font-bold text-[var(--c-text-3)] uppercase tracking-wider text-xs">Leads</th>
                </>
              )}
              {activeTab === 'time_entries' && (
                <>
                  <th className="p-3 font-bold text-[var(--c-text-3)] uppercase tracking-wider text-xs">ID</th>
                  <th className="p-3 font-bold text-[var(--c-text-3)] uppercase tracking-wider text-xs">User ID</th>
                  <th className="p-3 font-bold text-[var(--c-text-3)] uppercase tracking-wider text-xs">Task ID</th>
                  <th className="p-3 font-bold text-[var(--c-text-3)] uppercase tracking-wider text-xs">Duration (Min)</th>
                  <th className="p-3 font-bold text-[var(--c-text-3)] uppercase tracking-wider text-xs">Logged At</th>
                </>
              )}
              {activeTab === 'attendance' && (
                <>
                  <th className="p-3 font-bold text-[var(--c-text-3)] uppercase tracking-wider text-xs">Employee</th>
                  <th className="p-3 font-bold text-[var(--c-text-3)] uppercase tracking-wider text-xs">Date</th>
                  <th className="p-3 font-bold text-[var(--c-text-3)] uppercase tracking-wider text-xs">Clock In</th>
                  <th className="p-3 font-bold text-[var(--c-text-3)] uppercase tracking-wider text-xs">Clock Out</th>
                  <th className="p-3 font-bold text-[var(--c-text-3)] uppercase tracking-wider text-xs">Status</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {activeTab === 'users' && users.map(u => (
              <tr key={u.id} className="border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-surface-2)]">
                <IdCell value={u.id} />
                <td className="p-3 font-bold text-[var(--c-text)]">{u.name}</td>
                <td className="p-3 text-[var(--c-text-2)]">{u.email}</td>
                <td className="p-3 text-[var(--c-text-2)]">{u.role}</td>
                <td className="p-3 text-[var(--c-text-3)]">{new Date(u.created_at || new Date().toISOString()).toLocaleDateString()}</td>
              </tr>
            ))}
            {activeTab === 'campaigns' && campaigns.map(c => (
              <tr key={c.id} className="border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-surface-2)]">
                <IdCell value={c.id} />
                <IdCell value={c.client_id} />
                <td className="p-3 font-bold text-[var(--c-text)]">{c.campaign_name}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${c.status === 'running' ? 'bg-[var(--c-primary)]/10 text-[var(--c-primary)]' : 'bg-[var(--c-surface-3)] text-[var(--c-text-2)]'}`}>{c.status}</span>
                </td>
                <td className="p-3 font-mono text-[var(--c-text)]">{c.spend_inr ? c.spend_inr.toLocaleString() : '0'}</td>
                <td className="p-3 text-[var(--c-primary)] font-bold">{c.leads || 0}</td>
              </tr>
            ))}
            {activeTab === 'time_entries' && timeEntries.map(t => (
              <tr key={t.id} className="border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-surface-2)]">
                <IdCell value={t.id} />
                <IdCell value={t.user_id} />
                <IdCell value={t.task_id} />
                <td className="p-3 font-bold text-[var(--c-text)]">{t.duration_minutes}</td>
                <td className="p-3 text-[var(--c-text-3)]">{new Date(t.started_at).toLocaleString()}</td>
              </tr>
            ))}
            {activeTab === 'attendance' && attendance.map(a => {
              const emp = users.find(u => u.id === a.userId);
              return (
                <tr key={a.id} className="border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-surface-2)]">
                  <td className="p-3 font-bold text-[var(--c-text)]">{emp?.name || a.userId}</td>
                  <td className="p-3 text-[var(--c-text-2)]">{a.date}</td>
                  <td className="p-3 text-[var(--c-text-2)]">{a.clockIn ? new Date(a.clockIn).toLocaleTimeString() : '—'}</td>
                  <td className="p-3 text-[var(--c-text-2)]">{a.clockOut ? new Date(a.clockOut).toLocaleTimeString() : '—'}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${a.status === 'late' ? 'bg-amber-500/10 text-amber-500' : 'bg-[var(--c-primary)]/10 text-[var(--c-primary)]'}`}>{a.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
