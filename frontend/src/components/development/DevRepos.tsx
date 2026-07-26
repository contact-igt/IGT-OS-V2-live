'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { GitBranch, AlertCircle, CheckCircle2, Clock, FolderGit2, X, GitCommit } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function RepoDetailPanel({ project, onClose }: { project: any; onClose: () => void }) {
  const { state } = useApp();
  const { teamMembers, githubCommits } = state;

  const repoCommits = (githubCommits || []).filter((c: any) => c.repo === project.name);
  const contributorRows = project.developers
    .map((devId: string) => {
      const member = teamMembers.find((m: any) => m.id === devId);
      if (!member) return null;
      const commits = repoCommits
        .filter((c: any) => c.userId === devId)
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return { member, latestCommit: commits[0] || null, commitCount: commits.length };
    })
    .filter(Boolean) as { member: any; latestCommit: any; commitCount: number }[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border shadow-xl"
        style={{ borderColor: 'var(--c-border)', backgroundColor: 'var(--c-surface)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--c-border)' }}>
          <div>
            <h2 className="font-semibold text-lg" style={{ color: 'var(--c-text)' }}>{project.name}</h2>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--c-text-2)' }}>{project.repoName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--c-surface-2)]" style={{ color: 'var(--c-text-2)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 p-5 border-b" style={{ borderColor: 'var(--c-border)' }}>
          <div>
            <span className="text-xs block" style={{ color: 'var(--c-text-2)' }}>Commits (Wk)</span>
            <span className="font-semibold text-lg" style={{ color: 'var(--c-text)' }}>{project.commitsThisWeek}</span>
          </div>
          <div>
            <span className="text-xs block" style={{ color: 'var(--c-text-2)' }}>Open PRs</span>
            <span className="font-semibold text-lg" style={{ color: 'var(--c-text)' }}>{project.openPRs}</span>
          </div>
          <div>
            <span className="text-xs block" style={{ color: 'var(--c-text-2)' }}>Issues</span>
            <span className="font-semibold text-lg" style={{ color: 'var(--c-text)' }}>{project.openIssues}</span>
          </div>
          <div>
            <span className="text-xs block" style={{ color: 'var(--c-text-2)' }}>Last Push</span>
            <span className="font-semibold text-lg" style={{ color: 'var(--c-text)' }}>{project.lastPush}</span>
          </div>
        </div>

        <div className="p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--c-text-2)' }}>Contributors</h3>
          {contributorRows.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--c-text-2)' }}>No contributor data for this repo yet.</p>
          )}
          <div className="flex flex-col gap-3">
            {contributorRows.map(({ member, latestCommit, commitCount }) => (
              <div key={member.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--c-surface-2)' }}>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: member.color }}
                >
                  {member.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm" style={{ color: 'var(--c-text)' }}>{member.name}</span>
                    <span className="text-xs" style={{ color: 'var(--c-text-2)' }}>{commitCount} commit{commitCount === 1 ? '' : 's'}</span>
                  </div>
                  {latestCommit ? (
                    <div className="flex items-start gap-1.5 mt-1">
                      <GitCommit size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--c-text-3)' }} />
                      <p className="text-xs truncate" style={{ color: 'var(--c-text-2)' }}>
                        {latestCommit.message} <span style={{ color: 'var(--c-text-3)' }}>· {timeAgo(latestCommit.timestamp)}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs mt-1" style={{ color: 'var(--c-text-3)' }}>No commits recorded yet.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DevRepos({ search = '' }: { search?: string }) {
  const { state } = useApp();
  const { user } = useAuth();
  const { devProjects, teamMembers, currentUserId } = state;
  const [selectedProject, setSelectedProject] = useState<typeof devProjects[0] | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/github/backfill`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      setSyncMessage(res.ok ? data.message : (data.error || 'Failed to start sync'));
    } catch (err) {
      setSyncMessage('Could not connect to the server');
    } finally {
      setSyncing(false);
    }
  };

  const currentUser = teamMembers.find(m => m.id === currentUserId);
  const isDeveloper = currentUser?.roleTag?.includes('developer') || currentUser?.department === 'Development';

  const scopedProjects = isDeveloper
    ? devProjects.filter(p => p.developers.includes(currentUserId))
    : devProjects;

  // Searching intentionally escapes the "only repos I've worked on" scope — otherwise a
  // developer could never discover/find a repo through search unless they'd already
  // contributed to it, which defeats the point of a search box.
  const query = search.trim().toLowerCase();
  const visibleProjects = query
    ? devProjects.filter(p => p.name.toLowerCase().includes(query))
    : scopedProjects;

  const internalProjects = visibleProjects.filter(p => p.isInternal);
  const clientProjects = visibleProjects.filter(p => !p.isInternal);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active': return { icon: GitBranch, color: '#10B981', label: 'Active' };
      case 'at_risk': return { icon: AlertCircle, color: '#EF4444', label: 'At Risk' };
      case 'handover': return { icon: Clock, color: '#F59E0B', label: 'Handover' };
      case 'completed': return { icon: CheckCircle2, color: '#8B5CF6', label: 'Completed' };
      default: return { icon: GitBranch, color: '#9CA3AF', label: status };
    }
  };

  const renderProjectCard = (project: typeof devProjects[0]) => {
    const statusCfg = getStatusConfig(project.status);
    const StatusIcon = statusCfg.icon;

    return (
      <div
        key={project.id}
        onClick={() => setSelectedProject(project)}
        className="rounded-xl border p-5 flex flex-col gap-4 transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer"
        style={{ borderColor: 'var(--c-border)', backgroundColor: 'var(--c-surface)' }}
      >
        <div className="flex justify-between items-start gap-4">
          <div>
            <h3 className="font-semibold text-lg" style={{ color: 'var(--c-text)' }}>{project.name}</h3>
            <p className="text-sm font-mono mt-1" style={{ color: 'var(--c-text-2)' }}>{project.repoName}</p>
          </div>
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
            style={{ 
              borderColor: `${statusCfg.color}40`, 
              backgroundColor: `${statusCfg.color}15`, 
              color: statusCfg.color 
            }}
          >
            <StatusIcon size={14} />
            {statusCfg.label}
          </div>
        </div>

        {project.alertMessage && (
          <div className="text-xs p-2.5 rounded-md font-medium text-red-500 bg-red-500/10 border border-red-500/20">
            {project.alertMessage}
          </div>
        )}

        {project.progressPercent !== undefined && (
          <div className="space-y-1.5 mt-auto pt-2">
            <div className="flex justify-between text-xs font-medium" style={{ color: 'var(--c-text-2)' }}>
              <span>Progress</span>
              <span>{project.progressPercent}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--c-surface-2)' }}>
              <div 
                className="h-full rounded-full transition-all duration-1000" 
                style={{ width: `${project.progressPercent}%`, backgroundColor: '#8B5CF6' }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mt-2 pt-4 border-t" style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex flex-col">
            <span className="text-xs" style={{ color: 'var(--c-text-2)' }}>Commits (Wk)</span>
            <span className="font-semibold" style={{ color: 'var(--c-text)' }}>{project.commitsThisWeek}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs" style={{ color: 'var(--c-text-2)' }}>Open PRs</span>
            <span className="font-semibold" style={{ color: 'var(--c-text)' }}>{project.openPRs}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs" style={{ color: 'var(--c-text-2)' }}>Issues</span>
            <span className="font-semibold" style={{ color: 'var(--c-text)' }}>{project.openIssues}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex -space-x-2">
            {project.developers.map((devId: string) => {
              const member = teamMembers.find(m => m.id === devId);
              if (!member) return null;
              return (
                <div 
                  key={devId}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2"
                  style={{ backgroundColor: member.color, borderColor: 'var(--c-surface)' }}
                  title={member.name}
                >
                  {member.initials}
                </div>
              );
            })}
          </div>
          <div className="text-xs" style={{ color: 'var(--c-text-2)' }}>
            Last push: {project.lastPush}
          </div>
        </div>
      </div>
    );
  };

  const syncBar = user?.role === 'admin' && (
    <div className="flex items-center gap-3 mb-2">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="text-xs font-semibold px-3 py-2 rounded-lg border transition-colors disabled:opacity-50"
        style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-2)' }}
      >
        {syncing ? 'Starting sync…' : 'Sync GitHub History'}
      </button>
      {syncMessage && <span className="text-xs" style={{ color: 'var(--c-text-2)' }}>{syncMessage}</span>}
    </div>
  );

  if (visibleProjects.length === 0) {
    return (
      <div className="flex flex-col gap-4 pb-10">
        {syncBar}
        <div className="flex flex-col items-center justify-center h-64" style={{ color: 'var(--c-text-2)' }}>
          <FolderGit2 size={48} className="mb-4 opacity-20" />
          <p>{query ? 'No projects match your search.' : 'No projects assigned to you.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      {syncBar}

      {clientProjects.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--c-text)' }}>Client Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {clientProjects.map(renderProjectCard)}
          </div>
        </section>
      )}

      {internalProjects.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--c-text)' }}>Internal Infrastructure</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {internalProjects.map(renderProjectCard)}
          </div>
        </section>
      )}

      {selectedProject && <RepoDetailPanel project={selectedProject} onClose={() => setSelectedProject(null)} />}
    </div>
  );
}
