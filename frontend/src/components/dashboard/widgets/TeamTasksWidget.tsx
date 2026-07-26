// @ts-nocheck
import React from "react";
import Link from "next/link";
import { GripHorizontal } from "lucide-react";
import { isOverdue } from "@/lib/data";

interface Props {
  compactMode: boolean;
  teamMembers: any[];
  tasks: any[]; // filtered task pool (any status except cancelled) assigned to anyone
}

const LEGEND = [
  { label: "In Progress", color: "#3B82F6" },
  { label: "Pending", color: "#F59E0B" },
  { label: "Late", color: "#EF4444" },
  { label: "Completed", color: "#94A3B8" },
];

const TeamTasksWidget = React.memo(function TeamTasksWidget({
  compactMode,
  teamMembers,
  tasks,
}: Props) {
  const rows = teamMembers
    .map((m: any) => {
      const mTasks = tasks.filter((t: any) => t.assignedTo?.includes(m.id) && t.status !== 'cancelled');
      if (mTasks.length === 0) return null;

      const mCompleted = mTasks.filter((t: any) => t.status === 'done');
      const mOpen = mTasks.filter((t: any) => t.status !== 'done');
      const mLate = mOpen.filter((t: any) => isOverdue(t));
      const mInProgress = mOpen.filter((t: any) => !mLate.includes(t) && t.status === 'in_progress');
      const mPending = mOpen.filter((t: any) => !mLate.includes(t) && t.status !== 'in_progress');

      return { member: m, total: mTasks.length, mCompleted, mOpen, mLate, mInProgress, mPending };
    })
    .filter(Boolean);

  return (
    <div
      className={`overflow-hidden h-full h-full w-full border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm ${compactMode ? "p-3" : "p-5"}`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2">
          <div className="drag-handle cursor-move p-1 -m-1 hover:bg-[var(--c-surface-2)] rounded transition-colors">
            <GripHorizontal className="w-4 h-4 text-[var(--c-text-3)]" />
          </div>
          <svg
            className="w-5 h-5 text-purple-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          Team-wise Task Distribution
        </h3>
        <Link
          href="/team"
          className="text-xs font-semibold text-[var(--c-text-2)] hover:text-[var(--c-text)]"
        >
          View all →
        </Link>
      </div>

      <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {rows.length === 0 && (
          <div className="text-sm text-[var(--c-text-2)] text-center py-4">No tasks assigned yet.</div>
        )}
        {rows.map(({ member: m, total, mLate, mInProgress, mPending, mCompleted }) => (
          <div key={m.id} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-sm font-medium truncate"
                style={{ color: m.color || "var(--c-text)" }}
              >
                {m.name || m.email}
              </span>
              <div className="flex gap-2 text-xs font-medium flex-shrink-0">
                <span className="text-[var(--c-text-2)]">{total} Total</span>
                {mInProgress.length > 0 && (
                  <span className="text-blue-500">{mInProgress.length} In Progress</span>
                )}
                {mPending.length > 0 && (
                  <span className="text-amber-500">{mPending.length} Pending</span>
                )}
                {mLate.length > 0 && (
                  <span className="text-red-500">{mLate.length} Late</span>
                )}
              </div>
            </div>
            <div className="w-full h-1.5 bg-[var(--c-surface)] rounded-full overflow-hidden flex gap-[2px]">
              {mInProgress.length > 0 && (
                <div
                  style={{ width: `${(mInProgress.length / total) * 100}%`, background: '#3B82F6' }}
                  className="h-full rounded-full"
                ></div>
              )}
              {mPending.length > 0 && (
                <div
                  style={{ width: `${(mPending.length / total) * 100}%`, background: '#F59E0B' }}
                  className="h-full rounded-full"
                ></div>
              )}
              {mLate.length > 0 && (
                <div
                  style={{ width: `${(mLate.length / total) * 100}%`, background: '#EF4444' }}
                  className="h-full rounded-full"
                ></div>
              )}
              {mCompleted.length > 0 && (
                <div
                  style={{ width: `${(mCompleted.length / total) * 100}%`, background: '#94A3B8' }}
                  className="h-full rounded-full"
                ></div>
              )}
            </div>
          </div>
        ))}
      </div>

      {rows.length > 0 && (
        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-4 pt-3 border-t" style={{ borderColor: 'var(--c-border)' }}>
          {LEGEND.map(l => (
            <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-[var(--c-text-2)]">
              <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

export default TeamTasksWidget;
