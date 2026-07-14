'use client';

import { useApp } from '@/contexts/AppContext';
import { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ComposedChart, Line, 
  ReferenceLine, PieChart, Pie, Cell, Legend, ResponsiveContainer 
} from 'recharts';

export default function CampaignAnalytics() {
  const { state } = useApp();

  const PLATFORM_COLORS: Record<string, string> = {
    google: '#3B82F6',
    meta: '#EC4899',
    youtube: '#EF4444',
    jio_hotstar: '#F59E0B',
    linkedin: '#0EA5E9',
    other: '#64748B'
  };
  
  const agencyBenchmarkCPL = 400;

  // Derive Graph 1: Leads by Client
  const leadsByClient = useMemo(() => {
    const data: any[] = [];
    const clientMap: Record<string, number> = {};
    
    state.campaigns.forEach(c => {
      const logs = (c.weeklyLogs || (c as any).weekly_logs || []).map((id: any) => state.campaignLogs2.find(l => l.id === id)).filter(Boolean);
      let leads = 0;
      logs.forEach(l => { if (l) leads += l.leads; });
      if (leads > 0) {
        if (!clientMap[c.clientId]) clientMap[c.clientId] = 0;
        clientMap[c.clientId] += leads;
      }
    });

    for (const [clientId, leads] of Object.entries(clientMap)) {
      const client = state.clients.find(c => c.id === clientId);
      data.push({
        clientName: client ? client.name : clientId,
        leads
      });
    }
    // Sort descending
    return data.sort((a, b) => b.leads - a.leads);
  }, [state.campaigns, state.campaignLogs2, state.clients]);

  // Derive Graph 2: Spend vs Leads Trend (Mock trend for agency)
  const weeklyTrend = useMemo(() => {
    return [
      { week: 'W1', leads: 40, spendINR: 15000 },
      { week: 'W2', leads: 48, spendINR: 17500 },
      { week: 'W3', leads: 35, spendINR: 14000 },
      { week: 'W4', leads: 60, spendINR: 22000 },
      { week: 'W5', leads: 55, spendINR: 20000 },
      { week: 'W6', leads: 70, spendINR: 25000 },
      { week: 'W7', leads: 85, spendINR: 28000 },
      { week: 'W8', leads: 94, spendINR: 31000 },
    ];
  }, []);

  // Derive Graph 3: CPL By Client
  const cplByClient = useMemo(() => {
    // Just mapping a few manually based on the request requirements for demonstration
    return [
      { clientName: 'Pixel Eye', googleCPL: 407, metaCPL: 500 },
      { clientName: 'Phoenix', googleCPL: 312, metaCPL: 218 },
      { clientName: 'Aarav Eye', googleCPL: 556, metaCPL: 0 },
    ];
  }, []);

  // Derive Platform Split
  const platformSplit = useMemo(() => {
    return [
      { platform: 'google', name: 'Google', value: 58 },
      { platform: 'meta', name: 'Meta', value: 35 },
      { platform: 'youtube', name: 'YouTube', value: 5 },
      { platform: 'other', name: 'Other', value: 2 },
    ];
  }, []);

  // Agency Totals Calculation
  const totalLeads = leadsByClient.reduce((acc, c) => acc + c.leads, 0);
  const totalSpend = 342000; // Mocked for design
  const avgCPL = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0;
  const activeCampaigns = state.campaigns.filter(c => c.status === 'live').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-[var(--c-text-2)]">Period:</span>
        <select className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-md px-3 py-1.5 text-sm">
          <option>This Month (July 2026)</option>
          <option>Last Month (June 2026)</option>
        </select>
        <span className="text-sm font-semibold text-[var(--c-text-2)] ml-4">Compare:</span>
        <select className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-md px-3 py-1.5 text-sm">
          <option>Previous Period</option>
          <option>Previous Year</option>
        </select>
      </div>

      {/* Top Totals row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--c-surface-2)] p-4 rounded-xl border border-[var(--c-border)]">
          <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-1">Total Leads</div>
          <div className="text-2xl font-bold text-[var(--c-text)]">{totalLeads}</div>
        </div>
        <div className="bg-[var(--c-surface-2)] p-4 rounded-xl border border-[var(--c-border)]">
          <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-1">Total Spend</div>
          <div className="text-2xl font-bold text-[var(--c-text)]">₹{(totalSpend).toLocaleString()}</div>
        </div>
        <div className="bg-[var(--c-surface-2)] p-4 rounded-xl border border-[var(--c-border)]">
          <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-1">Avg CPL</div>
          <div className="text-2xl font-bold text-[var(--c-text)]">₹{avgCPL}</div>
        </div>
        <div className="bg-[var(--c-surface-2)] p-4 rounded-xl border border-[var(--c-border)]">
          <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-1">Active Campaigns</div>
          <div className="text-2xl font-bold text-[var(--c-text)]">{activeCampaigns}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1 */}
        <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-5 rounded-xl shadow-sm flex flex-col h-[400px]">
          <h3 className="font-semibold text-sm mb-4">Leads by Client</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={leadsByClient} margin={{ left: 20, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="clientName" width={100} tick={{ fontSize: 12, fill: 'var(--c-text-2)' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'var(--c-surface-3)' }} contentStyle={{ backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-border)', borderRadius: '8px' }} />
                <Bar dataKey="leads" fill="#2AB182" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2 */}
        <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-5 rounded-xl shadow-sm flex flex-col h-[400px]">
          <h3 className="font-semibold text-sm mb-4 flex justify-between">
            Spend vs Leads Trend
            <span className="text-xs font-normal text-[var(--c-text-2)] border border-[var(--c-border)] px-2 py-0.5 rounded">All Channels</span>
          </h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weeklyTrend} margin={{ left: 0, right: 0 }}>
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'var(--c-text-2)' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 12, fill: '#2AB182' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#F97316' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-border)', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="leads" stroke="#2AB182" yAxisId="left" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="spendINR" stroke="#F97316" yAxisId="right" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 3 */}
        <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-5 rounded-xl shadow-sm flex flex-col h-[350px]">
          <h3 className="font-semibold text-sm mb-4">CPL by Client (Google vs Meta)</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cplByClient} margin={{ top: 20 }}>
                <XAxis dataKey="clientName" tick={{ fontSize: 12, fill: 'var(--c-text-2)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--c-text-2)' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'var(--c-surface-3)' }} contentStyle={{ backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-border)', borderRadius: '8px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="googleCPL" fill="#3B82F6" name="Google CPL" radius={[4, 4, 0, 0]} />
                <Bar dataKey="metaCPL" fill="#EC4899" name="Meta CPL" radius={[4, 4, 0, 0]} />
                <ReferenceLine y={agencyBenchmarkCPL} stroke="#2AB182" strokeDasharray="4 4" label={{ position: 'top', value: 'Benchmark (₹400)', fill: '#2AB182', fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform Split */}
        <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-5 rounded-xl shadow-sm flex flex-col h-[350px]">
          <h3 className="font-semibold text-sm mb-4 flex justify-between">
            Platform Split
            <span className="text-xs font-normal text-[var(--c-text-2)] border border-[var(--c-border)] px-2 py-0.5 rounded">By Spend</span>
          </h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={platformSplit} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {platformSplit.map((entry, i) => <Cell key={i} fill={PLATFORM_COLORS[entry.platform] || PLATFORM_COLORS.other} stroke="var(--c-surface)" strokeWidth={2} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-border)', borderRadius: '8px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Client-wise Analytics (Expandable) */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Client-wise Analytics</h2>
        <div className="flex flex-col gap-4">
          {state.clients.map(client => {
            // Calculate stats for this client
            const clientCampaigns = state.campaigns.filter(c => c.clientId === client.id);
            if (clientCampaigns.length === 0) return null;
            
            let clientLeads = 0;
            let clientSpend = 0; // mockup 
            clientCampaigns.forEach(c => {
              const logs = (c.weeklyLogs || (c as any).weekly_logs || []).map((id: any) => state.campaignLogs2.find(l => l.id === id)).filter(Boolean);
              logs.forEach(l => { if (l) clientLeads += l.leads; });
            });
            clientSpend = clientLeads * 450; // Mock spend
            const clientCPL = clientLeads > 0 ? Math.round(clientSpend / clientLeads) : 0;
            
            // Client specific trend (mock)
            const clientTrend = [
              { week: 'W1', leads: Math.floor(clientLeads * 0.1), spendINR: Math.floor(clientSpend * 0.1) },
              { week: 'W2', leads: Math.floor(clientLeads * 0.15), spendINR: Math.floor(clientSpend * 0.15) },
              { week: 'W3', leads: Math.floor(clientLeads * 0.12), spendINR: Math.floor(clientSpend * 0.12) },
              { week: 'W4', leads: Math.floor(clientLeads * 0.2), spendINR: Math.floor(clientSpend * 0.2) },
            ];

            return (
              <ClientAnalyticsAccordion 
                key={client.id}
                client={client}
                leads={clientLeads}
                spend={clientSpend}
                cpl={clientCPL}
                activeCampaigns={clientCampaigns.filter(c => c.status === 'live').length}
                trendData={clientTrend}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Separate component for the accordion state
function ClientAnalyticsAccordion({ client, leads, spend, cpl, activeCampaigns, trendData }: any) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl overflow-hidden shadow-sm transition-all">
      {/* Header (Always visible) */}
      <div 
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-[var(--c-surface-2)] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4 w-1/4">
          <div className="w-10 h-10 rounded-full bg-[var(--c-surface-3)] flex items-center justify-center font-bold text-[var(--c-text)]">
            {client.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-[var(--c-text)]">{client.name}</div>
            <div className="text-xs text-[var(--c-text-2)]">{activeCampaigns} Active Campaigns</div>
          </div>
        </div>

        <div className="flex-1 flex justify-around items-center px-4">
          <div className="text-center">
            <div className="text-[10px] uppercase font-bold text-[var(--c-text-2)] mb-1">Total Leads</div>
            <div className="font-bold">{leads}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase font-bold text-[var(--c-text-2)] mb-1">Total Spend</div>
            <div className="font-bold text-orange-500">₹{spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase font-bold text-[var(--c-text-2)] mb-1">Avg CPL</div>
            <div className="font-bold text-emerald-500">₹{cpl}</div>
          </div>
        </div>

        <div className="w-10 flex justify-end text-[var(--c-text-3)]">
          <span className="material-symbols-outlined transition-transform duration-300" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            expand_more
          </span>
        </div>
      </div>

      {/* Expandable Body */}
      {expanded && (
        <div className="p-5 border-t border-[var(--c-border)] bg-[var(--c-surface-2)]">
          <h4 className="text-sm font-semibold mb-4">Spend vs Leads Trend (Client Specific)</h4>
          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ left: -20, right: 0 }}>
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'var(--c-text-2)' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 12, fill: '#2AB182' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#F97316' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-border)', borderRadius: '8px' }} />
                <Bar dataKey="leads" fill="#2AB182" yAxisId="left" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line type="monotone" dataKey="spendINR" stroke="#F97316" yAxisId="right" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
