import Link from 'next/link';

interface TeamMemberPulse {
  id: string;
  firstName: string;
  roleTag: string;
  initials: string;
  hasOverdueTasks: boolean;
  activeTaskName?: string;
  isTimerRunning: boolean;
}

interface TeamPulseRowProps {
  members: TeamMemberPulse[];
}

export function TeamPulseRow({ members }: TeamPulseRowProps) {
  return (
    <div className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6 mb-6">
      <h3 className="font-syne font-bold text-[var(--c-text)] text-sm uppercase tracking-wider mb-4">
        Team Pulse
      </h3>
      
      <div className="flex flex-wrap gap-4">
        {members.map((member) => (
          <Link
            key={member.id}
            href={`/team/${member.id}`}
            className="group relative flex flex-col items-center gap-2"
          >
            {/* Avatar */}
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-[var(--c-surface-3)] border-2 border-[var(--c-border)] flex items-center justify-center font-bold text-[var(--c-text)] transition-transform group-hover:scale-105">
                {member.initials}
              </div>
              
              {/* Status Indicators */}
              {member.isTimerRunning && (
                <div 
                  className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[var(--c-surface)] bg-emerald-500" 
                  title={`Running: ${member.activeTaskName}`}
                />
              )}
              {member.hasOverdueTasks && !member.isTimerRunning && (
                <div 
                  className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[var(--c-surface)] bg-red-500" 
                  title="Has overdue tasks"
                />
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-semibold text-[var(--c-text)]">{member.firstName}</span>
              <span className="text-[10px] font-medium text-[var(--c-text-3)] bg-[var(--c-surface-2)] px-1.5 py-0.5 rounded-full mt-1">
                {member.roleTag}
              </span>
            </div>
            
            {/* Tooltip on Hover */}
            {member.isTimerRunning && member.activeTaskName && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                <div className="bg-gray-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap">
                  ⏱ {member.activeTaskName}
                </div>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
