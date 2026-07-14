// @ts-nocheck
import React from "react";
import Link from "next/link";
import { GripHorizontal } from "lucide-react";

interface Props {
  compactMode: boolean;
  presentCount: number;
  totalTeam: number;
  notClockedIn: any[];
  presentUserIds: string[];
  teamMembers: any[];
}

const TeamSnapshotWidget = React.memo(function TeamSnapshotWidget({
  compactMode,
  presentCount,
  totalTeam,
  notClockedIn,
  presentUserIds,
  teamMembers,
}: Props) {
  return (
    <>
      {" "}
      {/* Module 2: Team Snapshot */}{" "}
      <div className="overflow-hidden w-full h-full border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] p-5 flex flex-col shadow-sm">
        <h3 className="font-semibold mb-4 text-[var(--c-text)] flex items-center gap-2">
        <div className="drag-handle cursor-move p-1 -m-1 hover:bg-[var(--c-surface-2)] rounded transition-colors">
          <GripHorizontal className="w-4 h-4 text-[var(--c-text-3)]" />
        </div>
          <svg
            className="w-5 h-5 text-emerald-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          Team Snapshot
        </h3>
        <div className="flex items-center gap-5 mb-4">
          <div className="w-16 h-16 rounded-full border-[4px] border-emerald-500/20 flex items-center justify-center bg-[var(--c-surface)] shadow-sm">
            <div className="text-xl font-bold text-emerald-500">
              {presentCount}
              <span className="text-xs text-[var(--c-text-2)] font-normal opacity-70">
                /{totalTeam}
              </span>
            </div>
          </div>
          <div>
            <div className={`font-semibold text-lg ${presentCount > 0 ? 'text-emerald-500' : 'text-[var(--c-text-3)]'}`}>
              {presentCount > 0 ? `${presentCount} Present` : 'No one clocked in'}
            </div>
            <div className="text-sm font-medium text-[var(--c-text-2)]">
              {Math.max(0, totalTeam - presentCount)} Not Clocked In
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div>
            <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-2">
              Clocked In
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(presentUserIds).length === 0 ? (
                <div className="text-xs text-[var(--c-text-3)] italic py-1">
                  No one has clocked in yet today
                </div>
              ) : (
                Array.from(presentUserIds).map((uid: any) => {
                  const m = teamMembers.find((member: any) => member.id === uid);
                  if (!m) return null;
                  return (
                    <div
                      key={uid}
                      className="text-xs font-medium bg-[var(--c-surface)] border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1.5"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      {m.name || m.email || m.id}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {notClockedIn.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-2">
                Away
              </div>
              <div className="flex flex-wrap gap-1.5">
                {notClockedIn.map((m: any) => (
                  <div
                    key={m.id}
                    className="text-xs font-medium bg-[var(--c-surface)] border border-[var(--c-border)] text-[var(--c-text-2)] px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1.5"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                    {m.name || m.email || m.id}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
});

export default TeamSnapshotWidget;
