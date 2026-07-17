'use client';

import React, { useState } from 'react';
import DevActivityFeed from './DevActivityFeed';
import DevRepos from './DevRepos';
import DevMetrics from './DevMetrics';
import { Activity, FolderGit2, BarChart2, Search } from 'lucide-react';

type Tab = 'Activity' | 'Repos & Projects' | 'Metrics';

export default function DevContent() {
  const [activeTab, setActiveTab] = useState<Tab>('Repos & Projects');
  const [search, setSearch] = useState('');

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'Repos & Projects', label: 'Repos & Projects', icon: FolderGit2 },
    { id: 'Activity', label: 'Activity Feed', icon: Activity },
    { id: 'Metrics', label: 'Metrics', icon: BarChart2 },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-[var(--c-bg)]">
      {/* Tabs */}
      <div className="px-6 py-3 flex-none border-b" style={{ borderColor: 'var(--c-border)', backgroundColor: 'var(--c-surface)' }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-6">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 pb-3 border-b-2 transition-colors relative top-[13px]"
                  style={{
                    color: isActive ? '#8B5CF6' : 'var(--c-text-2)',
                    borderColor: isActive ? '#8B5CF6' : 'transparent',
                    fontWeight: isActive ? 600 : 400
                  }}
                >
                  <Icon size={16} />
                  <span className="text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
          <div className="relative w-56 flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
            <input
              type="text"
              placeholder="Search repos or projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-surface-2 text-sm outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6" style={{ backgroundColor: 'var(--c-bg)' }}>
        {activeTab === 'Repos & Projects' && <DevRepos search={search} />}
        {activeTab === 'Activity' && <DevActivityFeed />}
        {activeTab === 'Metrics' && <DevMetrics />}
      </div>
    </div>
  );
}
