'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';

export default function DevMetrics() {
  const { state } = useApp();
  const { devProjects, githubCommits, teamMembers } = state;

  // Chart 1: Commits per developer (all time or from githubCommits)
  const commitData = useMemo(() => {
    const counts: Record<string, number> = {};
    githubCommits.forEach(c => {
      counts[c.userId] = (counts[c.userId] || 0) + 1;
    });
    
    return Object.entries(counts).map(([userId, count]) => {
      const member = teamMembers.find(m => m.id === userId);
      return {
        name: member?.name || userId,
        initials: member?.initials || '??',
        color: member?.color || '#8B5CF6',
        commits: count
      };
    }).sort((a, b) => b.commits - a.commits);
  }, [githubCommits, teamMembers]);

  // Chart 2: Project status distribution
  const statusData = useMemo(() => {
    const counts = {
      active: 0,
      at_risk: 0,
      handover: 0,
      completed: 0,
    };
    devProjects.forEach(p => {
      if (counts[p.status as keyof typeof counts] !== undefined) {
        counts[p.status as keyof typeof counts]++;
      }
    });
    
    return [
      { name: 'Active', value: counts.active, color: '#10B981' },
      { name: 'At Risk', value: counts.at_risk, color: '#EF4444' },
      { name: 'Handover', value: counts.handover, color: '#F59E0B' },
      { name: 'Completed', value: counts.completed, color: '#8B5CF6' },
    ].filter(item => item.value > 0);
  }, [devProjects]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Commits per developer */}
        <div 
          className="rounded-xl border p-5 flex flex-col"
          style={{ borderColor: 'var(--c-border)', backgroundColor: 'var(--c-surface)' }}
        >
          <div className="mb-6">
            <h3 className="font-semibold" style={{ color: 'var(--c-text)' }}>Commits by Developer</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--c-text-2)' }}>Total commits recorded in the system</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={commitData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false} />
                <XAxis 
                  dataKey="initials" 
                  tick={{ fill: 'var(--c-text-2)', fontSize: 12 }} 
                  axisLine={{ stroke: 'var(--c-border)' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: 'var(--c-text-2)', fontSize: 12 }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'var(--c-surface-2)' }}
                  contentStyle={{ backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-border)', color: 'var(--c-text)', borderRadius: '8px' }}
                />
                <Bar dataKey="commits" radius={[4, 4, 0, 0]}>
                  {commitData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Status */}
        <div 
          className="rounded-xl border p-5 flex flex-col"
          style={{ borderColor: 'var(--c-border)', backgroundColor: 'var(--c-surface)' }}
        >
          <div className="mb-6">
            <h3 className="font-semibold" style={{ color: 'var(--c-text)' }}>Project Status</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--c-text-2)' }}>Distribution of active vs completed projects</p>
          </div>
          <div className="h-64 w-full flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-border)', color: 'var(--c-text)', borderRadius: '8px' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: 'var(--c-text)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--c-border)', backgroundColor: 'var(--c-surface)' }}>
          <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-2)' }}>Total Commits</div>
          <div className="text-3xl font-bold" style={{ color: 'var(--c-text)' }}>{githubCommits.length}</div>
        </div>
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--c-border)', backgroundColor: 'var(--c-surface)' }}>
          <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-2)' }}>Active Projects</div>
          <div className="text-3xl font-bold" style={{ color: 'var(--c-text)' }}>{devProjects.filter(p => p.status === 'active').length}</div>
        </div>
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--c-border)', backgroundColor: 'var(--c-surface)' }}>
          <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-2)' }}>Internal Repos</div>
          <div className="text-3xl font-bold" style={{ color: 'var(--c-text)' }}>{devProjects.filter(p => p.isInternal).length}</div>
        </div>
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--c-border)', backgroundColor: 'var(--c-surface)' }}>
          <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-2)' }}>Developers</div>
          <div className="text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
            {new Set(devProjects.flatMap(p => p.developers)).size}
          </div>
        </div>
      </div>
    </div>
  );
}
