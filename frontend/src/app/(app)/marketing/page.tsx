'use client';

import React, { useState } from 'react';
import { 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Activity, 
  PieChart,
  BarChart3,
  Calendar,
  AlertTriangle,
  Megaphone
} from 'lucide-react';
import { AD_ACCOUNT_BALANCES } from '@/lib/seed_meetings';
import { MOCK_CAMPAIGNS } from '@/lib/seed_campaigns';
import { CLIENTS } from '@/lib/data';

// Helper function to get account status based on balance assuming 1000 INR/day spend
const getAccountStatus = (balance: number) => {
  if (balance < 1000) return { color: 'bg-red-500/20 text-red-500 border-red-500/30', label: 'CRITICAL', icon: AlertCircle };
  if (balance < 2000) return { color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', label: 'WARNING', icon: AlertTriangle };
  return { color: 'bg-green-500/20 text-green-500 border-green-500/30', label: 'HEALTHY', icon: CheckCircle2 };
};

export default function MarketingDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'google' | 'meta'>('overview');

  const filteredBalances = AD_ACCOUNT_BALANCES.filter(
    (b) => activeTab === 'overview' || b.platform === activeTab
  );

  const filteredCampaigns = MOCK_CAMPAIGNS.filter(
    (c) => activeTab === 'overview' || c.platform === activeTab
  );

  // Quick stats calculations
  const totalBalance = filteredBalances.reduce((acc, curr) => acc + curr.balanceINR, 0);
  const totalSpend = filteredBalances.reduce((acc, curr) => acc + curr.allocatedINR, 0);
  const totalConversions = filteredCampaigns.reduce((acc, curr) => acc + (curr.conversions || 0), 0);
  const avgCpl = filteredCampaigns.reduce((acc, curr) => acc + (curr.cpl || 0), 0) / (filteredCampaigns.filter(c => c.cpl).length || 1);

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--c-bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-app-text font-syne flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-primary" />
            Performance Marketing Dashboard
          </h1>
          <p className="text-app-text3 mt-2 text-sm max-w-xl">
            Monitor real-time ad account balances, campaign performance metrics, and policy issues across Google and Meta.
          </p>
        </div>
        
        {/* Quick Tabs */}
        <div className="flex p-1 bg-app-surface border border-app-border rounded-lg">
          {(['overview', 'google', 'meta'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
                activeTab === tab 
                  ? 'bg-[var(--c-primary)] bg-opacity-10 text-[var(--c-primary)]' 
                  : 'text-app-text3 hover:text-app-text'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="p-6 bg-app-surface border border-app-border rounded-2xl flex flex-col gap-2">
          <span className="text-app-text3 text-xs font-semibold tracking-wider uppercase">Total Ad Balance</span>
          <div className="text-2xl font-bold text-app-text">₹{totalBalance.toLocaleString()}</div>
        </div>
        <div className="p-6 bg-app-surface border border-app-border rounded-2xl flex flex-col gap-2">
          <span className="text-app-text3 text-xs font-semibold tracking-wider uppercase">Total Allocated</span>
          <div className="text-2xl font-bold text-app-text">₹{totalSpend.toLocaleString()}</div>
        </div>
        <div className="p-6 bg-app-surface border border-app-border rounded-2xl flex flex-col gap-2">
          <span className="text-app-text3 text-xs font-semibold tracking-wider uppercase">Total Conversions</span>
          <div className="text-2xl font-bold text-app-text">{totalConversions}</div>
        </div>
        <div className="p-6 bg-app-surface border border-app-border rounded-2xl flex flex-col gap-2">
          <span className="text-app-text3 text-xs font-semibold tracking-wider uppercase">Avg CPL</span>
          <div className="text-2xl font-bold text-app-text">₹{avgCpl.toFixed(2)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Account Balances */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-app-text2" />
            <h2 className="text-lg font-semibold text-app-text">Account Balances</h2>
          </div>
          
          <div className="space-y-4">
            {filteredBalances.map(acc => {
              const status = getAccountStatus(acc.balanceINR);
              const StatusIcon = status.icon;
              
              return (
                <div key={acc.id} className={`p-4 rounded-xl border bg-app-surface ${status.color.split(' ')[2]}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-app-text text-sm">{acc.accountName}</h3>
                      <p className="text-xs text-app-text3 capitalize">{acc.platform} • {acc.accountId}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-[10px] font-bold ${status.color}`}>
                      {status.label}
                    </div>
                  </div>
                  
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-xs text-app-text3 mb-1">Current Balance</div>
                      <div className="text-lg font-bold text-app-text flex items-center gap-2">
                        ₹{acc.balanceINR.toLocaleString()}
                        <StatusIcon className={`w-4 h-4 ${status.color.split(' ')[1]}`} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-app-text3 mb-1">Est. Days Left</div>
                      <div className="text-sm font-medium text-app-text">
                        {(acc.balanceINR / 1000).toFixed(1)} Days
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Campaigns & Insights */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-app-text2" />
            <h2 className="text-lg font-semibold text-app-text">Campaign Insights</h2>
          </div>
          
          <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-app-surface-2 border-b border-app-border text-xs text-app-text3 uppercase tracking-wider">
                    <th className="p-4 font-semibold">Campaign</th>
                    <th className="p-4 font-semibold">Client</th>
                    <th className="p-4 font-semibold text-right">CPL</th>
                    <th className="p-4 font-semibold text-right">CPM</th>
                    <th className="p-4 font-semibold text-right">Conv.</th>
                    <th className="p-4 font-semibold text-right">Impressions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {filteredCampaigns.map(camp => {
                    const client = CLIENTS.find(c => c.id === camp.clientId);
                    return (
                      <tr key={camp.id} className="hover:bg-app-hover/50 transition-colors">
                        <td className="p-4">
                          <div className="font-medium text-app-text text-sm">{camp.name}</div>
                          <div className="text-xs flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded-full ${
                              camp.status === 'live' ? 'bg-green-500/10 text-green-500' : 'bg-app-surface-3 text-app-text3'
                            }`}>
                              {camp.status}
                            </span>
                            {camp.policyIssues && camp.policyIssues.length > 0 && (
                              <span className="flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" /> Policy Issue
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-app-text2">{client?.name || 'Unknown'}</td>
                        <td className="p-4 text-sm text-right font-mono text-app-text">₹{camp.cpl || '-'}</td>
                        <td className="p-4 text-sm text-right font-mono text-app-text">₹{camp.cpm || '-'}</td>
                        <td className="p-4 text-sm text-right font-mono text-app-text">{camp.conversions || '-'}</td>
                        <td className="p-4 text-sm text-right font-mono text-app-text">{camp.impressions?.toLocaleString() || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upcoming Campaign Plans */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-app-text2" />
              <h2 className="text-lg font-semibold text-app-text">Upcoming Campaign Plans & Pauses</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCampaigns.filter(c => c.pausedAt).map(camp => (
                <div key={camp.id} className="p-4 border border-app-border bg-app-surface rounded-xl flex items-start gap-4">
                  <div className="p-3 bg-red-500/10 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-app-text text-sm">{camp.name}</h4>
                    <p className="text-xs text-app-text3 mt-1">Scheduled to pause on <strong className="text-app-text2">{camp.pausedAt}</strong></p>
                  </div>
                </div>
              ))}
              {filteredCampaigns.filter(c => !c.pausedAt).slice(0, 1).map(camp => (
                <div key={camp.id} className="p-4 border border-app-border bg-app-surface rounded-xl flex items-start gap-4 opacity-50">
                  <div className="p-3 bg-app-surface-3 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-app-text2" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-app-text text-sm">No other upcoming plans</h4>
                    <p className="text-xs text-app-text3 mt-1">All other campaigns running as expected.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
