'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { getTaskTypeStats, getAgencyWeekHeatmap, isoToYYYYMMDD, toISTDate } from '@/lib/analytics';
import { DEFAULT_BENCHMARKS, TASK_TYPE_LABELS, TaskCategory } from '@/lib/data';
import { BarChart3, Clock, Zap, Target, TrendingUp, Users, GitBranch, GitPullRequest, GitCommit, Filter } from 'lucide-react';

export default function AnalyticsPage() {
  const { state } = useApp();
  const [dateRange, setDateRange] = useState<30 | 7 | 90>(30);
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | 'all'>('all');

  // 1. Studio Throughput (Task Types)
  const taskTypeStats = useMemo(() => {
    const types = new Set(state.tasks.map(t => t.taskType).filter(Boolean) as string[]);
    const stats = Array.from(types).map(type => 
      getTaskTypeStats(type, dateRange, state.timeEntries, state.tasks, DEFAULT_BENCHMARKS)
    ).filter(s => s.count > 0);
    
    // Sort by count descending
    return stats.sort((a, b) => b.count - a.count);
  }, [state.tasks, state.timeEntries, dateRange]);

  // Filter stats by category if needed
  const filteredStats = useMemo(() => {
    if (selectedCategory === 'all') return taskTypeStats;
    // Map taskType back to category if we strictly need to, 
    // but in reality we might just filter tasks directly. 
    // For simplicity, we just show all types currently active.
    return taskTypeStats; 
  }, [taskTypeStats, selectedCategory]);

  // 2. Agency Heatmap
  const heatmapData = useMemo(() => {
    // eslint-disable-next-line
    const weekStartIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // Past 7 days
    return getAgencyWeekHeatmap(weekStartIso, state.timeEntries, state.teamMembers);
  }, [state.timeEntries, state.teamMembers]);

  // Aggregate Metrics
  const totalCompleted = taskTypeStats.reduce((sum, s) => sum + s.count, 0);
  const totalMinutes = taskTypeStats.reduce((sum, s) => sum + s.avgMinutes * s.count, 0);
  const totalBenchmark = taskTypeStats.reduce((sum, s) => sum + s.benchmarkMinutes * s.count, 0);
  
  const overallEfficiency = totalBenchmark > 0 ? (totalBenchmark / totalMinutes) * 100 : 100;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 bg-app-bg">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-syne text-app-text tracking-tight mb-2">Studio Analytics</h1>
          <p className="text-sm font-grotesk text-app-text2">
            Production throughput, utilization, and efficiency metrics
          </p>
        </div>
        <div className="flex bg-app-surface border border-app-border rounded-lg p-1">
          {[7, 30, 90].map(days => (
            <button
              key={days}
              onClick={() => setDateRange(days as 7 | 30 | 90)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                dateRange === days 
                  ? 'bg-app-surface2 text-app-text shadow-sm' 
                  : 'text-app-text3 hover:text-app-text2'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-app-surface border border-app-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2 text-app-text3">
            <Target className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-sm uppercase tracking-wider">Total Output</h3>
          </div>
          <p className="text-3xl font-bold text-app-text">{totalCompleted} <span className="text-sm font-normal text-app-text3">units</span></p>
        </div>
        
        <div className="bg-app-surface border border-app-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2 text-app-text3">
            <Clock className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-sm uppercase tracking-wider">Time Logged</h3>
          </div>
          <p className="text-3xl font-bold text-app-text">{Math.round(totalMinutes / 60)} <span className="text-sm font-normal text-app-text3">hrs</span></p>
        </div>

        <div className="bg-app-surface border border-app-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2 text-app-text3">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-sm uppercase tracking-wider">Benchmark Var</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-app-text">{Math.abs(Math.round(100 - overallEfficiency))}%</p>
            <span className={`text-sm font-medium ${overallEfficiency > 100 ? 'text-red-500' : 'text-green-500'}`}>
              {overallEfficiency > 100 ? 'Over' : 'Under'} Target
            </span>
          </div>
        </div>

        <div className="bg-app-surface border border-app-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2 text-app-text3">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-sm uppercase tracking-wider">Avg Efficiency</h3>
          </div>
          <p className="text-3xl font-bold text-app-text">{Math.round(overallEfficiency)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Production Throughput */}
        <div className="lg:col-span-2 bg-app-surface border border-app-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-app-text3" />
            <h2 className="text-lg font-bold font-syne text-app-text">Production Throughput</h2>
          </div>
          
          <div className="space-y-6">
            {filteredStats.map(stat => (
              <div key={stat.taskType} className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-app-text">{TASK_TYPE_LABELS[stat.taskType] || stat.taskType}</span>
                  <div className="flex gap-4 text-app-text3 text-xs">
                    <span>{stat.count} items</span>
                    <span>Avg: {Math.round(stat.avgMinutes)}m</span>
                    <span>Target: {stat.benchmarkMinutes}m</span>
                  </div>
                </div>
                
                {/* Progress bar comparing avg vs benchmark */}
                <div className="w-full h-3 bg-app-surface2 rounded-full overflow-hidden flex relative">
                  <div 
                    className={`h-full ${stat.efficiency > 110 ? 'bg-red-500' : stat.efficiency < 90 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min((stat.avgMinutes / Math.max(stat.benchmarkMinutes, 1)) * 100, 100)}%` }}
                  />
                  {/* Benchmark indicator line */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
                    style={{ left: `${Math.min((stat.benchmarkMinutes / Math.max(stat.avgMinutes, stat.benchmarkMinutes, 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}

            {filteredStats.length === 0 && (
              <div className="py-12 text-center text-app-text3 text-sm">
                No production data for this period.
              </div>
            )}
          </div>
        </div>

        {/* Team Heatmap */}
        <div className="bg-app-surface border border-app-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-app-text3" />
            <h2 className="text-lg font-bold font-syne text-app-text">Team Utilization (7d)</h2>
          </div>

          <div className="space-y-4">
            {heatmapData.filter(d => d.days.some(day => day.minutes > 0)).map(person => (
              <div key={person.member.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                     style={{ backgroundColor: person.member.color }}>
                  {person.member.initials}
                </div>
                <div className="flex-1 flex gap-1">
                  {person.days.map((day, i) => {
                    // Calculate intensity (max 8 hours = 480 mins)
                    const intensity = Math.min(day.minutes / 480, 1);
                    return (
                      <div 
                        key={i} 
                        title={`${day.date}: ${Math.round(day.minutes/60)}h ${day.minutes%60}m`}
                        className="flex-1 h-8 rounded-sm transition-colors"
                        style={{ 
                          backgroundColor: day.minutes > 0 
                            ? `rgba(42, 177, 130, ${0.2 + intensity * 0.8})` 
                            : 'var(--c-surface2)' 
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
            
            {heatmapData.filter(d => d.days.some(day => day.minutes > 0)).length === 0 && (
              <div className="py-8 text-center text-app-text3 text-sm">
                No time logged in the past 7 days.
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-between items-center text-[10px] text-app-text3 uppercase tracking-wider">
            <span>Less</span>
            <div className="flex gap-1 w-24">
              <div className="flex-1 h-2 rounded-sm bg-app-surface2"></div>
              <div className="flex-1 h-2 rounded-sm bg-[rgba(42,177,130,0.4)]"></div>
              <div className="flex-1 h-2 rounded-sm bg-[rgba(42,177,130,0.7)]"></div>
              <div className="flex-1 h-2 rounded-sm bg-[#2AB182]"></div>
            </div>
            <span>More</span>
          </div>
        </div>

        {/* Sales Funnel */}
        <div className="lg:col-span-3 bg-app-surface border border-app-border rounded-xl p-6 mt-2">
          <div className="flex items-center gap-2 mb-6">
            <Filter className="w-5 h-5 text-app-text3" />
            <h2 className="text-lg font-bold font-syne text-app-text">Sales Funnel (Q3 Projection)</h2>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col items-center flex-1 w-full relative">
              <div className="w-full bg-surface-2 border border-border p-4 rounded-t-xl text-center relative z-10" style={{ maxWidth: '100%' }}>
                <span className="text-xs uppercase text-text-3 font-bold tracking-wider">Leads</span>
                <div className="text-2xl font-bold text-text mt-1">124</div>
              </div>
              <div className="w-full bg-surface border border-border border-t-0 p-4 text-center relative z-20 shadow-md" style={{ maxWidth: '80%', marginTop: '-4px' }}>
                <span className="text-xs uppercase text-text-3 font-bold tracking-wider">Qualified</span>
                <div className="text-2xl font-bold text-primary mt-1">48</div>
              </div>
              <div className="w-full bg-surface-2 border border-border border-t-0 p-4 text-center relative z-30 shadow-md rounded-b-xl" style={{ maxWidth: '60%', marginTop: '-4px' }}>
                <span className="text-xs uppercase text-text-3 font-bold tracking-wider">Closed Won</span>
                <div className="text-2xl font-bold text-emerald-500 mt-1">12</div>
              </div>
            </div>
            
            <div className="flex-1 w-full grid grid-cols-2 gap-4">
              <div className="p-4 border border-border rounded-xl bg-surface-2">
                <span className="text-xs text-text-3 font-bold">Conversion Rate</span>
                <div className="text-xl font-bold text-text mt-1">9.6%</div>
                <span className="text-[10px] text-emerald-500 font-medium flex items-center mt-1">↑ 2.1% vs last month</span>
              </div>
              <div className="p-4 border border-border rounded-xl bg-surface-2">
                <span className="text-xs text-text-3 font-bold">Avg Deal Size</span>
                <div className="text-xl font-bold text-text mt-1">₹45,000</div>
              </div>
              <div className="p-4 border border-border rounded-xl bg-surface-2">
                <span className="text-xs text-text-3 font-bold">Sales Cycle</span>
                <div className="text-xl font-bold text-text mt-1">14 days</div>
              </div>
              <div className="p-4 border border-border rounded-xl bg-surface-2">
                <span className="text-xs text-text-3 font-bold">Pipeline Value</span>
                <div className="text-xl font-bold text-amber-500 mt-1">₹5,40,000</div>
              </div>
            </div>
          </div>
        </div>

        {/* GitHub Integration Mock */}
        <div className="lg:col-span-3 bg-app-surface border border-app-border rounded-xl p-6 mt-2">
          <div className="flex items-center gap-2 mb-6">
            <GitBranch className="w-5 h-5 text-app-text3" />
            <h2 className="text-lg font-bold font-syne text-app-text">Codebase Activity (GitHub)</h2>
            <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase">Connected</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-app-text flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-app-text3" /> Total Commits (7d)
                </span>
                <span className="font-bold text-app-text">342</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-app-text flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-app-text3" /> PRs Merged (7d)
                </span>
                <span className="font-bold text-app-text">28</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-app-text flex items-center gap-2">
                  <Clock className="w-4 h-4 text-app-text3" /> Avg Review Time
                </span>
                <span className="font-bold text-app-text">3h 45m</span>
              </div>
            </div>

            <div className="md:col-span-2">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-app-text3 mb-3">Recent Activity</h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-app-surface2 border border-app-border">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold">NS</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-app-text truncate">Merged PR <span className="font-mono text-primary">#142</span>: Calendar 2D Scrolling Fixes</p>
                    <p className="text-[10px] text-app-text3">2 hours ago • invictus-os/frontend</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-app-surface2 border border-app-border">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold">AB</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-app-text truncate">Pushed to <span className="font-mono text-primary">feature/sales-crm</span></p>
                    <p className="text-[10px] text-app-text3">5 hours ago • invictus-os/backend</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
