'use client';

import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { GitBranch, AlertCircle, CheckCircle2, Clock, FolderGit2 } from 'lucide-react';

export default function DevRepos({ search = '' }: { search?: string }) {
  const { state } = useApp();
  const { devProjects, teamMembers, currentUserId } = state;

  const currentUser = teamMembers.find(m => m.id === currentUserId);
  const isDeveloper = currentUser?.roleTag?.includes('developer') || currentUser?.department === 'Development';

  const scopedProjects = isDeveloper
    ? devProjects.filter(p => p.developers.includes(currentUserId))
    : devProjects;

  const query = search.trim().toLowerCase();
  const visibleProjects = query
    ? scopedProjects.filter(p => p.name.toLowerCase().includes(query))
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
        className="rounded-xl border p-5 flex flex-col gap-4 transition-all hover:-translate-y-1 hover:shadow-lg"
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

  if (visibleProjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64" style={{ color: 'var(--c-text-2)' }}>
        <FolderGit2 size={48} className="mb-4 opacity-20" />
        <p>{query ? 'No projects match your search.' : 'No projects assigned to you.'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
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
    </div>
  );
}
