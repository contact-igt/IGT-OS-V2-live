'use client';

import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import TaskCard from '@/components/tasks/TaskCard';
import { useMarketingData } from '@/lib/useMarketingData';
import ProvenanceBadge from '@/components/ui/ProvenanceBadge';
import { Activity, TrendingUp } from 'lucide-react';

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { state } = useApp();
  const { user } = useAuth();
  const { id } = use(params);
  
  const [client, setClient] = useState<any>(null);
  const [activeServices, setActiveServices] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'marketing'>('tasks');
  const marketing = useMarketingData();

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        const opts: RequestInit = { credentials: 'include' };

        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const [clientRes, delivRes, invRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/clients/${id}`, opts),
          fetch(`${apiBaseUrl}/api/clients/${id}/deliverables`, opts),
          fetch(`${apiBaseUrl}/api/clients/${id}/invoices`, opts)
        ]);

        if (clientRes.ok) setClient(await clientRes.json());
        if (delivRes.ok) setActiveServices(await delivRes.json());
        if (invRes.ok) setInvoices(await invRes.json());
      } catch (err) {
        console.error('Failed to fetch client data', err);
      } finally {
        setLoading(false);
      }
    }
    fetchClientData();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-[var(--c-text-2)]">Loading client details...</div>;
  }

  if (!client) {
    return (
      <div className="p-8 text-[var(--c-error)]">
        <h2>Client not found</h2>
        <Link href="/clients" className="text-[var(--c-primary)] hover:underline mt-4 inline-block">Return to Clients</Link>
      </div>
    );
  }

  // Real Tasks
  const relatedTasks = state.tasks.filter(t => t.clientId === id);
  const todoTasks = relatedTasks.filter(t => t.status === 'todo');
  const inProgressTasks = relatedTasks.filter(t => t.status === 'in_progress');
  const doneTasks = relatedTasks.filter(t => t.status === 'done');

  // Marketing Data
  const clientCampaigns = marketing.campaigns.filter(c => c.client_id === id);
  const clientBalances = marketing.balances.filter(b => b.clientId === id);

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8 min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/clients" className="p-2 rounded-lg hover:bg-[var(--c-surface-2)] transition-colors flex items-center justify-center text-[var(--c-text-3)] hover:text-[var(--c-text)]">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-syne text-[var(--c-text)]">{client.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-[var(--c-text-2)]">
            <span className="font-mono bg-[var(--c-primary)]/10 text-[var(--c-primary)] px-2 py-0.5 rounded font-bold">{client.short_code || client.code || 'CODE'}</span>
            <span>Client Portal</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">person</span>
              {client.primary_contact || 'Main Contact'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Client Info & Services */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          <div className="bg-[var(--c-surface)] rounded-xl border border-[var(--c-border)] p-6 shadow-sm">
            <h2 className="text-lg font-bold font-syne text-[var(--c-text)] mb-4">Client Info</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-[var(--c-border)] pb-2">
                <span className="text-[var(--c-text-2)]">Email:</span>
                <span className="font-bold">{client.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--c-border)] pb-2">
                <span className="text-[var(--c-text-2)]">Phone:</span>
                <span className="font-bold">{client.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--c-border)] pb-2">
                <span className="text-[var(--c-text-2)]">Status:</span>
                <span className={`font-bold ${client.status === 'active' ? 'text-[var(--c-primary)]' : 'text-[var(--c-text-3)]'}`}>
                  {client.status?.toUpperCase() || 'ACTIVE'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--c-surface)] rounded-xl border border-[var(--c-border)] p-6 shadow-sm">
            <h2 className="text-lg font-bold font-syne text-[var(--c-text)] mb-4 flex justify-between items-center">
              Active Services
              <button className="text-[var(--c-primary)] hover:underline text-sm font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">add</span> Add
              </button>
            </h2>
            <div className="space-y-4">
              {activeServices.length === 0 && <div className="text-[var(--c-text-3)] text-sm">No active services found.</div>}
              {activeServices.map((s, i) => (
                <div key={i} className="bg-[var(--c-bg)] border border-[var(--c-border)] rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-[var(--c-text)] text-sm">{s.deliverable_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${s.is_active ? 'bg-[var(--c-primary)]/10 text-[var(--c-primary)]' : 'bg-[var(--c-surface-3)] text-[var(--c-text-2)]'}`}>{s.is_active ? 'Active' : 'Paused'}</span>
                  </div>
                  <div className="text-xs text-[var(--c-text-3)]">{s.quantity_per_month} {s.unit} ({s.deliverable_type})</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-[var(--c-surface)] rounded-xl border border-[var(--c-border)] p-6 shadow-sm">
            <h2 className="text-lg font-bold font-syne text-[var(--c-text)] mb-4 flex justify-between items-center">
              Invoices
              <button className="text-[var(--c-primary)] hover:underline text-sm font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">receipt_long</span> View All
              </button>
            </h2>
            <div className="space-y-0">
              {invoices.length === 0 && <div className="text-[var(--c-text-3)] text-sm p-3">No invoices generated yet.</div>}
              {invoices.map((inv, i) => (
                <div key={i} className="flex justify-between items-center border-b border-[var(--c-border)] last:border-0 py-3">
                  <div>
                    <div className="font-bold text-[var(--c-text)] text-sm">{inv.invoice_number}</div>
                    <div className="text-xs text-[var(--c-text-3)]">{new Date(inv.issue_date).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[var(--c-text)] text-sm">₹{inv.amount_inr?.toLocaleString()}</div>
                    <div className={`text-xs font-bold capitalize ${
                      inv.status === 'paid' ? 'text-[var(--c-primary)]' : 
                      inv.status === 'pending' ? 'text-amber-500' : 'text-[var(--c-text-3)]'
                    }`}>{inv.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Tasks & Marketing */}
        <div className="lg:col-span-2 bg-[var(--c-surface)] rounded-xl border border-[var(--c-border)] shadow-sm flex flex-col h-[800px] overflow-hidden">
          <div className="p-4 border-b border-[var(--c-border)] bg-[var(--c-surface-2)] flex justify-between items-center">
            <div className="flex gap-2 bg-[var(--c-bg)] p-1 rounded-lg border border-[var(--c-border)]">
              <button 
                onClick={() => setActiveTab('tasks')}
                className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${activeTab === 'tasks' ? 'bg-[var(--c-surface)] text-[var(--c-text)] shadow-sm border border-[var(--c-border)]' : 'text-[var(--c-text-3)] hover:text-[var(--c-text-2)]'}`}
              >
                Tasks ({todoTasks.length})
              </button>
              <button 
                onClick={() => setActiveTab('marketing')}
                className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${activeTab === 'marketing' ? 'bg-[var(--c-surface)] text-[var(--c-text)] shadow-sm border border-[var(--c-border)]' : 'text-[var(--c-text-3)] hover:text-[var(--c-text-2)]'}`}
              >
                Marketing Data
              </button>
            </div>
            {activeTab === 'tasks' && (
              <div className="flex gap-2">
                <span className="text-xs font-bold px-2 py-1 bg-[var(--c-primary)]/10 text-[var(--c-primary)] rounded">In Progress: {inProgressTasks.length}</span>
              </div>
            )}
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto space-y-6 bg-[var(--c-bg)]">
            {activeTab === 'tasks' ? (
              relatedTasks.length === 0 ? (
                <div className="text-center p-8 text-[var(--c-text-3)]">No tasks assigned to this client.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {relatedTasks.map(task => (
                    <TaskCard key={task.id} task={task} onClick={() => {}} />
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-6">
                {/* Marketing Tab Content */}
                <h3 className="font-syne font-bold text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[var(--c-primary)]" />
                  Marketing Performance
                </h3>
                
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--c-text-2)]">
                  <ProvenanceBadge kind="DATABASE" note="Entered in IGT OS; not verified against the ad platform" /> manually recorded figures
                  <ProvenanceBadge kind="ACCESS REQUIRED" note="Meta / Google Ads sync not connected" /> live platform sync
                </div>
                {marketing.error && <div role="alert" className="text-sm" style={{ color: 'var(--c-error)' }}>Unavailable: {marketing.error}. This is not an empty result.</div>}

                {/* Account Balances */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!marketing.error && clientBalances.length === 0 && <div className="text-[var(--c-text-3)] text-sm col-span-2">No ad account balances recorded.</div>}
                  {clientBalances.map(acc => {
                    const days = acc.daysRemaining;
                    const tone = days == null ? 'var(--c-warning)' : days < 3 ? 'var(--c-error)' : days < 7 ? 'var(--c-warning)' : 'var(--c-success)';
                    return (
                      <div key={acc.id} className="p-4 rounded-xl border" style={{ borderColor: tone }}>
                        <div className="text-xs font-bold uppercase tracking-wider mb-1 text-[var(--c-text-2)]">{acc.platform || 'Platform n/a'} Ads</div>
                        <div className="font-bold text-lg">{acc.balance != null ? `₹${Number(acc.balance).toLocaleString('en-IN')}` : '—'}</div>
                        <div className="text-xs mt-1" style={{ color: tone }}>{days != null ? `${days} days remaining` : 'days remaining unknown'}</div>
                      </div>
                    )
                  })}
                </div>

                {/* Campaigns List */}
                <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl overflow-hidden mt-6">
                  <div className="px-4 py-3 bg-[var(--c-surface-2)] border-b border-[var(--c-border)]">
                    <h4 className="font-bold text-sm">Active Campaigns</h4>
                  </div>
                  {clientCampaigns.length === 0 ? (
                    <div className="p-4 text-sm text-[var(--c-text-3)]">No campaigns recorded.</div>
                  ) : (
                    <div className="divide-y divide-[var(--c-border)]">
                      {clientCampaigns.map(camp => {
                        const sp = camp.spend_inr, ld = camp.leads;
                        return (
                          <div key={camp.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <div className="font-bold text-sm">{camp.campaign_name}</div>
                              <div className="flex gap-2 items-center mt-1">
                                <span className="text-[10px] uppercase font-bold bg-[var(--c-surface-3)] px-2 py-0.5 rounded">{camp.campaign_type}</span>
                                <span className="text-[10px] uppercase font-bold bg-[var(--c-surface-3)] px-2 py-0.5 rounded">{camp.status}</span>
                              </div>
                            </div>
                            <div className="flex gap-6 text-right">
                              <div>
                                <div className="text-[10px] text-[var(--c-text-3)] uppercase" title="Derived: spend ÷ leads">CPL</div>
                                <div className="font-mono font-bold text-sm">{sp != null && ld ? `₹${Math.round(sp / ld).toLocaleString('en-IN')}` : '—'}</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-[var(--c-text-3)] uppercase">Conv.</div>
                                <div className="font-mono font-bold text-sm">{camp.conversions ?? '—'}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
