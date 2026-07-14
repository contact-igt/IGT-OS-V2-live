'use client';

import { useApp } from '@/contexts/AppContext';
import { useState, useMemo } from 'react';

export default function CampaignsByClient({ onOpenCampaign }: { onOpenCampaign: (id: string) => void }) {
  const { state } = useApp();
  
  const [clientFilter, setClientFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');

  const filteredCampaigns = useMemo(() => {
    return state.campaigns.filter(c => {
      if (clientFilter !== 'all' && c.clientId !== clientFilter) return false;
      if (platformFilter !== 'all' && c.platform !== platformFilter) return false;
      if (statusFilter === 'active' && !['live', 'paused', 'problem'].includes(c.status)) return false;
      if (statusFilter !== 'all' && statusFilter !== 'active' && c.status !== statusFilter) return false;
      return true;
    });
  }, [state.campaigns, clientFilter, platformFilter, statusFilter]);

  // Group by client
  const clientGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredCampaigns.forEach(c => {
      if (!groups[c.clientId]) groups[c.clientId] = [];
      groups[c.clientId].push(c);
    });
    return groups;
  }, [filteredCampaigns]);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'live': return <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded text-xs font-bold">🟢 Live</span>;
      case 'paused': return <span className="text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded text-xs font-bold">🟡 Paused</span>;
      case 'pending': return <span className="text-[var(--c-text-2)] bg-[var(--c-surface-3)] px-2 py-0.5 rounded text-xs font-bold">⏳ Pending</span>;
      case 'problem': return <span className="text-red-500 bg-red-500/10 px-2 py-0.5 rounded text-xs font-bold">🔴 Problem</span>;
      default: return <span className="text-[var(--c-text-2)] bg-[var(--c-surface-3)] px-2 py-0.5 rounded text-xs font-bold">⚫ Ended</span>;
    }
  };

  const getPlatformLabel = (p: string) => {
    const map: any = { google: 'Google', meta: 'Meta', youtube: 'YouTube', jio_hotstar: 'Display', linkedin: 'LinkedIn', other: 'Other' };
    return map[p] || p;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-[var(--c-text-2)]">Filter:</span>
        <select 
          className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-md px-3 py-1.5 text-sm"
          value={clientFilter} onChange={e => setClientFilter(e.target.value)}
        >
          <option value="all">All Clients</option>
          {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        
        <select 
          className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-md px-3 py-1.5 text-sm"
          value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}
        >
          <option value="all">All Platforms</option>
          <option value="meta">Meta</option>
          <option value="google">Google</option>
          <option value="jio_hotstar">Display</option>
        </select>
        
        <select 
          className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-md px-3 py-1.5 text-sm"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="live">Live</option>
          <option value="paused">Paused</option>
          <option value="problem">Problem</option>
        </select>
      </div>

      {/* Client Groups */}
      {Object.keys(clientGroups).length === 0 ? (
        <div className="text-center py-12 text-[var(--c-text-2)]">No campaigns match your filters.</div>
      ) : (
        Object.entries(clientGroups).map(([clientId, camps]) => {
          const client = state.clients.find(c => c.id === clientId);
          if (!client) return null;
          
          // Get unique assignees for this client's campaigns
          const assignedIds = new Set<string>();
          camps.forEach(c => c.assignedTo.forEach((id: string) => assignedIds.add(id)));
          const assigneesText = Array.from(assignedIds).map(id => state.teamMembers.find(m => m.id === id)?.name || id).join(' · ');

          // Calculate totals
          let totalLeads = 0;
          let totalSpend = 0;
          camps.forEach(c => {
            if (c.weeklyLogs && c.weeklyLogs.length > 0) {
              const latestLog = state.campaignLogs2.find(l => l.id === c.weeklyLogs[c.weeklyLogs.length - 1]);
              if (latestLog) {
                totalLeads += latestLog.leads;
                totalSpend += latestLog.spendINR;
              }
            }
          });
          const avgCPL = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0;
          const totalBudget = camps.reduce((sum, c) => sum + c.monthlyBudgetINR, 0);

          return (
            <div key={clientId} className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl overflow-hidden shadow-sm">
              {/* Header */}
              <div className="bg-[var(--c-surface-2)] p-4 border-b border-[var(--c-border)]">
                <h2 className="font-bold text-lg text-[var(--c-text)]">CLIENT: {client.name.toUpperCase()}</h2>
                {assigneesText && (
                  <p className="text-sm text-[var(--c-text-2)] mt-1">Assigned: {assigneesText}</p>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[var(--c-text-2)] border-b border-[var(--c-border)] uppercase text-xs">
                      <th className="p-4 font-semibold w-1/3">Campaign</th>
                      <th className="p-4 font-semibold">Platform</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold text-right">Wk Leads</th>
                      <th className="p-4 font-semibold text-right">CPL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--c-border)]">
                    {camps.map(c => {
                      const latestLog = c.weeklyLogs?.length > 0 ? state.campaignLogs2.find(l => l.id === c.weeklyLogs[c.weeklyLogs.length - 1]) : null;
                      const cpl = latestLog && latestLog.leads > 0 ? Math.round(latestLog.spendINR / latestLog.leads) : null;
                      
                      return (
                        <tr 
                          key={c.id} 
                          className="hover:bg-[var(--c-surface-3)] transition-colors cursor-pointer"
                          onClick={() => onOpenCampaign(c.id)}
                        >
                          <td className="p-4 font-medium">{c.name}</td>
                          <td className="p-4 text-[var(--c-text-2)]">{getPlatformLabel(c.platform)}</td>
                          <td className="p-4">{getStatusBadge(c.status)}</td>
                          <td className="p-4 text-right font-medium">{latestLog ? latestLog.leads : '—'}</td>
                          <td className="p-4 text-right text-[var(--c-text-2)]">{cpl ? `₹${cpl}` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary Footer */}
              <div className="bg-[var(--c-surface-2)] p-4 border-t border-[var(--c-border)] text-sm space-y-2">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="font-medium">
                    <span className="text-[var(--c-text-2)] mr-2">Month totals:</span>
                    {totalLeads} leads <span className="opacity-40 px-1">·</span> ₹{avgCPL} avg CPL <span className="opacity-40 px-1">·</span> ₹{Math.round(totalSpend/1000)}K spend
                  </div>
                  <div className="text-[var(--c-text-2)]">
                    <span className="text-emerald-500 font-bold">▲ +{Math.round(totalLeads*0.2)} leads</span> vs last month <span className="opacity-40 px-1">·</span> ✅ improving
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="font-medium">
                    <span className="text-[var(--c-text-2)] mr-2">Combined Budget:</span>
                    ₹{totalBudget.toLocaleString()} <span className="opacity-40 px-1">·</span> Utilised: ₹{Math.round(totalSpend/1000)}K/₹{Math.round(totalBudget/1000)}K ✅
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
      
      <div className="flex gap-4">
        <button className="bg-[var(--c-text)] text-[var(--c-bg)] font-semibold px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-90">
          + Add Campaign
        </button>
        <button className="bg-[var(--c-surface)] border border-[var(--c-border)] text-[var(--c-text)] font-semibold px-4 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--c-surface-3)]">
          Export all →
        </button>
      </div>
    </div>
  );
}
