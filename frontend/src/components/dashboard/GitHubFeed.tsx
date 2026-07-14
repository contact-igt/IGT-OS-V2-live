interface GitHubActivity {
  id: string;
  taskCode: string;
  description: string;
  timeAgo: string;
  additions: number;
  deletions: number;
  status: 'COMMITTED' | 'NO_COMMITS_3D';
}

interface GitHubFeedProps {
  activities: GitHubActivity[];
}

export function GitHubFeed({ activities }: GitHubFeedProps) {
  return (
    <div className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-[var(--c-border)] flex justify-between items-center">
        <h3 className="font-syne font-bold text-[var(--c-text)] text-sm tracking-wider uppercase">
          GITHUB ACTIVITY — This Week
        </h3>
        <div className="flex gap-4 text-xs font-semibold text-[var(--c-text-2)]">
          <span>Weekly: 6 commits</span>
          <span>0 PRs opened</span>
          <span>0 PRs merged</span>
        </div>
      </div>
      
      <div className="p-2">
        <ul className="divide-y divide-[var(--c-border)]">
          {activities.map((activity) => (
            <li key={activity.id} className="flex items-center justify-between p-4 hover:bg-[var(--c-hover)] transition-colors rounded-lg">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] ${activity.status === 'NO_COMMITS_3D' ? 'text-amber-500' : 'text-blue-500'}`}>
                  {activity.status === 'NO_COMMITS_3D' ? '○' : '●'}
                </span>
                <span className="font-mono text-xs font-bold text-[var(--c-text-3)]">{activity.taskCode}</span>
                <span className="text-sm font-medium text-[var(--c-text)]">{activity.description}</span>
              </div>
              
              <div className="flex items-center gap-6">
                <span className={`text-xs ${activity.status === 'NO_COMMITS_3D' ? 'text-amber-500 font-bold' : 'text-[var(--c-text-2)]'}`}>
                  {activity.status === 'NO_COMMITS_3D' ? 'no commits in 3d ⚠' : `committed ${activity.timeAgo}`}
                </span>
                
                {activity.status !== 'NO_COMMITS_3D' && (
                  <div className="flex items-center gap-2 font-mono text-xs font-bold w-20 justify-end">
                    <span className="text-emerald-500">+{activity.additions}</span>
                    <span className="text-red-500">-{activity.deletions}</span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-6 py-3 border-t border-[var(--c-border)] bg-[var(--c-surface-2)] text-center">
        <button className="text-[var(--c-primary)] font-bold text-xs hover:underline">
          [Connect GitHub to see live data →]
        </button>
      </div>
    </div>
  );
}
