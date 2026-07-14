'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Star, TrendingUp, Users, CheckCircle, Activity, ArrowUpRight, DollarSign, Briefcase } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CeoDashboardPage() {
  const { user } = useAuth();
  const { state } = useApp();
  const router = useRouter();

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return <div className="p-8 text-center text-red-500">Access Denied: CEO Only</div>;
  }

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
        <div className="bg-app-surface border border-app-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-sm font-bold text-app-text2">Monthly ARR</div>
          </div>
          <div className="text-3xl font-bold font-syne text-app-text mb-2">$1.2M</div>
          <div className="text-xs text-green-500 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> +12% from last month</div>
        </div>
        <div className="bg-app-surface border border-app-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-sm font-bold text-app-text2">Active Clients</div>
          </div>
          <div className="text-3xl font-bold font-syne text-app-text mb-2">{state.clients.length}</div>
          <div className="text-xs text-green-500 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> +2 this week</div>
        </div>
        <div className="bg-app-surface border border-app-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-sm font-bold text-app-text2">Agency Health</div>
          </div>
          <div className="text-3xl font-bold font-syne text-app-text mb-2">98%</div>
          <div className="text-xs text-app-text3">Based on client retention & delivery</div>
        </div>
        <div className="bg-app-surface border border-app-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-sm font-bold text-app-text2">Team Size</div>
          </div>
          <div className="text-3xl font-bold font-syne text-app-text mb-2">{state.teamMembers.length}</div>
          <div className="text-xs text-app-text3">Across 6 departments</div>
        </div>
      </div>

      {/* Strategic Initiatives */}
      <div className="bg-app-surface border border-app-border rounded-xl p-6">
        <h2 className="text-lg font-bold font-syne mb-6 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" /> Strategic Initiatives Q3
        </h2>
        <div className="space-y-4">
          {[
            { name: 'Launch AI-Driven Ad Buying', progress: 85, owner: 'Abhilash' },
            { name: 'Expand Dubai Operations', progress: 40, owner: 'Sushil' },
            { name: 'Client Retention Program v2', progress: 100, owner: 'Anitha' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-app-surface2 rounded-lg border border-app-border">
              <div>
                <div className="font-bold text-app-text mb-1">{item.name}</div>
                <div className="text-xs text-app-text3">Owner: {item.owner}</div>
              </div>
              <div className="flex items-center gap-4 w-64">
                <div className="flex-1 h-2 bg-app-surface rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${item.progress}%` }}></div>
                </div>
                <span className="text-xs font-bold w-8 text-right">{item.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
