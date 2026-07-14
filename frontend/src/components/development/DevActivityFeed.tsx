'use client';

import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { GitCommit, Plus, Minus } from 'lucide-react';

function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
}

export default function DevActivityFeed() {
  const { state } = useApp();
  const { githubCommits, teamMembers, currentUserId } = state;

  const currentUser = teamMembers.find(m => m.id === currentUserId);
  const isDeveloper = currentUser?.roleTag?.includes('developer') || currentUser?.department === 'Development';

  // Filter commits
  const visibleCommits = isDeveloper 
    ? githubCommits.filter(c => c.userId === currentUserId)
    : githubCommits;

  // Sort by newest
  const sortedCommits = [...visibleCommits].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--c-border)', backgroundColor: 'var(--c-surface)' }}>
        <table className="w-full text-left text-sm">
          <thead style={{ backgroundColor: 'var(--c-surface-2)', color: 'var(--c-text-2)' }}>
            <tr>
              <th className="py-3 px-4 font-medium">Developer</th>
              <th className="py-3 px-4 font-medium">Repository</th>
              <th className="py-3 px-4 font-medium">Commit Message</th>
              <th className="py-3 px-4 font-medium text-right">Changes</th>
              <th className="py-3 px-4 font-medium text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y border-app-border">
            {sortedCommits.map(commit => {
              const author = teamMembers.find(m => m.id === commit.userId);
              return (
                <tr key={commit.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                        style={{ backgroundColor: author?.color || '#9ca3af' }}
                      >
                        {author?.initials || '??'}
                      </div>
                      <span className="font-medium" style={{ color: 'var(--c-text)' }}>
                        {author?.name || commit.userId}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 rounded-md font-mono text-xs" style={{ backgroundColor: 'var(--c-surface-2)', color: 'var(--c-text)' }}>
                      {commit.repo}
                    </span>
                  </td>
                  <td className="py-3 px-4" style={{ color: 'var(--c-text)' }}>
                    <div className="flex items-center gap-2">
                      <GitCommit size={14} className="text-[#8B5CF6]" />
                      <span className="font-medium">{commit.message}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-3 text-xs font-mono">
                      <span className="flex items-center text-green-500">
                        <Plus size={12} />{commit.additions}
                      </span>
                      <span className="flex items-center text-red-500">
                        <Minus size={12} />{commit.deletions}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right" style={{ color: 'var(--c-text-2)' }}>
                    {getRelativeTime(commit.timestamp)}
                  </td>
                </tr>
              );
            })}
            
            {sortedCommits.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center" style={{ color: 'var(--c-text-2)' }}>
                  No commits found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
