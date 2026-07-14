'use client';

import { useApp } from '@/contexts/AppContext';
import { useEffect, useState } from 'react';

export default function CampaignDrawer({ campaignId, onClose }: { campaignId: string, onClose: () => void }) {
  const { state } = useApp();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const campaign = state.campaigns.find(c => c.id === campaignId);
  
  if (!campaign) return null;

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'live': return <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded text-xs font-bold">🟢 Live since {new Date(campaign.startDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>;
      case 'paused': return <span className="text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded text-xs font-bold">🟡 Paused</span>;
      case 'pending': return <span className="text-[var(--c-text-2)] bg-[var(--c-surface-3)] px-2 py-0.5 rounded text-xs font-bold">⏳ Pending</span>;
      case 'problem': return <span className="text-red-500 bg-red-500/10 px-2 py-0.5 rounded text-xs font-bold">🔴 Problem</span>;
      default: return <span className="text-[var(--c-text-2)] bg-[var(--c-surface-3)] px-2 py-0.5 rounded text-xs font-bold">⚫ Ended</span>;
    }
  };

  const assignees = campaign.assignedTo.map(id => state.teamMembers.find(m => m.id === id)?.name || id).join(' · ');

  // Compute logs
  const logs = (campaign.weeklyLogs || (campaign as any).weekly_logs || []).map((id: any) => state.campaignLogs2.find(l => l.id === id)).filter(Boolean) as any[];
  const currentMonthLogs = logs; // Mocking as if all logs are current month for simplicity
  const totalLeads = currentMonthLogs.reduce((sum, l) => sum + l.leads, 0);
  const totalSpend = currentMonthLogs.reduce((sum, l) => sum + l.spendINR, 0);
  const totalImpressions = currentMonthLogs.reduce((sum, l) => sum + l.impressions, 0);
  const totalClicks = currentMonthLogs.reduce((sum, l) => sum + l.clicks, 0);
  const avgCpl = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0;
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0';

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose} 
      />
      
      {/* Drawer */}
      <div 
        className={`fixed right-0 top-0 h-full w-full max-w-lg bg-[var(--c-bg)] border-l border-[var(--c-border)] z-50 flex flex-col shadow-2xl transition-transform duration-300 transform ${mounted ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--c-border)]">
          <div>
            <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase tracking-wider mb-1">Campaign Detail</div>
            <h2 className="text-xl font-bold text-[var(--c-text)]">{campaign.name}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-[var(--c-surface)] hover:bg-[var(--c-surface-3)] rounded-full transition-colors border border-[var(--c-border)]"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Metadata */}
          <div className="space-y-3 text-sm">
            <div className="flex"><span className="w-32 font-semibold text-[var(--c-text-2)]">STATUS:</span> {getStatusBadge(campaign.status)}</div>
            <div className="flex"><span className="w-32 font-semibold text-[var(--c-text-2)]">ASSIGNED TO:</span> <span className="font-medium">{assignees}</span></div>
            <div className="flex"><span className="w-32 font-semibold text-[var(--c-text-2)]">OBJECTIVE:</span> <span className="capitalize">{campaign.objective.replace('_', ' ')}</span></div>
            <div className="flex"><span className="w-32 font-semibold text-[var(--c-text-2)]">AD ACCOUNT:</span> <span className="text-blue-500 hover:underline cursor-pointer">{campaign.adAccountId} ↗</span></div>
            {campaign.landingPageUrl && (
              <div className="flex"><span className="w-32 font-semibold text-[var(--c-text-2)]">LANDING PAGE:</span> <span className="text-blue-500 hover:underline cursor-pointer">{campaign.landingPageUrl} ↗</span></div>
            )}
          </div>

          {/* Budget */}
          <div>
            <h3 className="font-bold text-[var(--c-text)] border-b border-[var(--c-border)] pb-2 mb-3">BUDGET</h3>
            <div className="bg-[var(--c-surface-2)] p-4 rounded-xl border border-[var(--c-border)] space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[var(--c-text-2)] font-medium">Monthly budget:</span> <span className="font-bold">₹{campaign.monthlyBudgetINR.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-[var(--c-text-2)] font-medium">Spent to date:</span> <span className="font-bold">₹{totalSpend.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-[var(--c-text-2)] font-medium">Projected end:</span> <span className="text-emerald-500 font-bold">₹{campaign.monthlyBudgetINR.toLocaleString()} ✅</span></div>
            </div>
          </div>

          {/* Performance */}
          <div>
            <h3 className="font-bold text-[var(--c-text)] border-b border-[var(--c-border)] pb-2 mb-3">PERFORMANCE — THIS MONTH</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-3 rounded-lg">
                <div className="text-[10px] uppercase font-bold text-[var(--c-text-2)]">Impressions</div>
                <div className="text-lg font-bold">{totalImpressions.toLocaleString()}</div>
              </div>
              <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-3 rounded-lg">
                <div className="text-[10px] uppercase font-bold text-[var(--c-text-2)]">Clicks</div>
                <div className="text-lg font-bold">{totalClicks.toLocaleString()} <span className="text-xs text-[var(--c-text-2)] font-normal ml-1">({ctr}%)</span></div>
              </div>
              <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-3 rounded-lg">
                <div className="text-[10px] uppercase font-bold text-[var(--c-text-2)]">Leads</div>
                <div className="text-lg font-bold">{totalLeads}</div>
              </div>
              <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-3 rounded-lg">
                <div className="text-[10px] uppercase font-bold text-[var(--c-text-2)]">Avg CPL</div>
                <div className="text-lg font-bold">₹{avgCpl}</div>
              </div>
            </div>
            <div className="text-sm bg-blue-500/10 p-3 rounded-lg text-blue-400 border border-blue-500/20">
              <strong>vs benchmark:</strong> CPL ₹{avgCpl} vs target ₹450 — {avgCpl > 450 ? '🟡 slightly above target' : '✅ on track'}
            </div>
          </div>

          {/* Weekly Trend */}
          <div>
            <h3 className="font-bold text-[var(--c-text)] border-b border-[var(--c-border)] pb-2 mb-3">WEEKLY TREND (Last 4 weeks)</h3>
            <div className="space-y-2">
              {logs.length > 0 ? logs.map((l, i) => (
                <div key={l.id} className="flex justify-between items-center text-sm p-2 bg-[var(--c-surface)] border border-[var(--c-border)] rounded">
                  <span className="font-medium text-[var(--c-text-2)]">Wk{i+1}:</span>
                  <span>{l.leads} leads <span className="text-[var(--c-text-2)] opacity-50 mx-1">·</span> ₹{l.leads > 0 ? Math.round(l.spendINR / l.leads) : 0} CPL</span>
                </div>
              )) : (
                <div className="text-sm text-[var(--c-text-2)]">No data logged yet.</div>
              )}
            </div>
          </div>

          {/* Linked Tasks */}
          {campaign.creativeTaskIds.length > 0 && (
            <div>
              <h3 className="font-bold text-[var(--c-text)] border-b border-[var(--c-border)] pb-2 mb-3">LINKED TASKS</h3>
              <div className="space-y-2">
                {campaign.creativeTaskIds.map(taskId => {
                  const t = state.tasks.find(tk => tk.id === taskId);
                  if (!t) return null;
                  return (
                    <div key={taskId} className="flex justify-between text-sm bg-[var(--c-surface)] border border-[var(--c-border)] p-2 rounded items-center">
                      <span className="text-blue-500 font-medium truncate pr-2 max-w-[200px]">{t.id} {t.title}</span>
                      <span className="text-xs bg-[var(--c-surface-3)] px-2 py-0.5 rounded capitalize">{t.status.replace('_',' ')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <h3 className="font-bold text-[var(--c-text)] border-b border-[var(--c-border)] pb-2 mb-3">NOTES</h3>
            <div className="text-sm text-[var(--c-text-2)] leading-relaxed whitespace-pre-wrap bg-[var(--c-surface-2)] p-4 rounded-xl border border-[var(--c-border)]">
              {campaign.notes || 'No notes added.'}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
