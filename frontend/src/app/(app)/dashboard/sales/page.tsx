'use client';

import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { PreviewBanner } from '@/components/dashboard/PreviewBanner';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { useState, useEffect } from 'react';
import TaskCard from '@/components/tasks/TaskCard';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export default function SalesDashboard() {
  const { state } = useApp();
  const { user } = useAuth();
  const salesUser = user?.role === 'sales' || user?.role === 'performance_marketing' 
    ? user 
    : (state.teamMembers.find(m => m.roleTag === 'sales' || m.roleTag === 'performance_marketer') || { name: 'Sales & Marketing Lead', role: 'sales' });

  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const token = localStorage.getItem('invictus_jwt');
        const res = await fetch('http://localhost:4000/api/analytics/sales', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (err) {
        console.error('Failed to fetch Sales analytics', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const getClientCode = (clientId: string) => {
    return state.clients.find(c => c.id === clientId)?.code || 'UNK';
  };
  const getClientName = (clientId: string) => {
    return state.clients.find(c => c.id === clientId)?.name || 'Unknown Client';
  };

  // Group marketing/sales tasks by client
  const relevantTasks = state.tasks.filter(t => 
    t.category === 'performance_marketing' || 
    t.category === 'social_media' || 
    t.category === 'strategy'
  );
  
  const tasksByClient = relevantTasks.reduce((acc, task) => {
    const clientId = task.clientId || 'unassigned';
    if (!acc[clientId]) acc[clientId] = [];
    acc[clientId].push(task);
    return acc;
  }, {} as Record<string, typeof state.tasks>);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  if (loading) {
    return <div className="p-8 text-[var(--c-text-2)]">Loading dashboard...</div>;
  }

  if (!analytics) {
    return <div className="p-8 text-[var(--c-error)]">Failed to load analytics</div>;
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* @ts-ignore - name property might be missing */}
      <PreviewBanner roleName="Sales & Marketing" userName={(salesUser as any).name || salesUser.email} />
      
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-[var(--c-text)] font-syne mb-2">Sales & Marketing Dashboard</h1>
            <p className="text-[var(--c-text-2)] font-grotesk">Track leads, campaign performance, and active marketing tasks.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <DashboardCard 
              title="Total Leads (Month)" 
              value={analytics.totalLeads.toString()} 
              icon="groups" 
            />
            <DashboardCard 
              title="Total Ad Spend" 
              value={formatCurrency(analytics.totalSpend)} 
              icon="payments" 
            />
            <DashboardCard 
              title="Average CPL" 
              value={`₹${analytics.avgCpl}`} 
              subtitle="-5 vs last month (Good)" 
              icon="trending_down" 
            />
            <DashboardCard 
              title="Active Campaigns" 
              value={analytics.campaignPerformance.length.toString()} 
              icon="campaign" 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6 h-[400px]">
                <h3 className="font-syne font-bold text-[var(--c-text)] text-sm tracking-wider uppercase mb-4">Pipeline Funnel</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.pipelineFunnel} layout="vertical" margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" horizontal={false} />
                    <XAxis type="number" stroke="var(--c-text-3)" tick={{ fill: 'var(--c-text-2)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="var(--c-text-3)" tick={{ fill: 'var(--c-text-2)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'var(--c-surface-2)' }} contentStyle={{ backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-border)', color: 'var(--c-text)' }} />
                    <Bar dataKey="value" fill="var(--c-primary)" radius={[0, 4, 4, 0]} name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <h2 className="text-xl font-bold text-[var(--c-text)] font-syne mb-4 mt-8">Campaign Tasks by Client</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(tasksByClient).map(([clientId, tasks]) => (
                  <div key={clientId} className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--c-border)]">
                      <h3 className="font-syne font-bold text-[var(--c-text)] text-lg truncate pr-2">
                        {getClientName(clientId)} <span className="text-[var(--c-text-3)] text-sm">({getClientCode(clientId)})</span>
                      </h3>
                    </div>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                      {tasks.map(task => (
                        <div key={task.id} className="text-sm p-3 border border-[var(--c-border)] rounded-lg bg-[var(--c-bg)]">
                          <span className="font-bold text-[var(--c-primary)]">[{task.status}]</span> {task.title}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="lg:col-span-1 space-y-6">
              <div className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6">
                <h3 className="font-syne font-bold text-[var(--c-text)] text-sm tracking-wider uppercase mb-4">Top Campaigns</h3>
                <div className="space-y-4">
                  {analytics.campaignPerformance.map((camp: any, idx: number) => (
                    <div key={idx} className="pb-4 border-b border-[var(--c-border)] last:border-0 last:pb-0">
                      <p className="font-bold text-[var(--c-text)]">{camp.name}</p>
                      <div className="flex justify-between mt-2 text-sm text-[var(--c-text-2)]">
                        <span>Leads: <strong className="text-[var(--c-text)]">{camp.leads}</strong></span>
                        <span>CPL: <strong className="text-[var(--c-primary)]">₹{camp.cpl}</strong></span>
                      </div>
                      <div className="mt-1 text-xs text-[var(--c-text-3)]">
                        Spend: {formatCurrency(camp.spend)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
