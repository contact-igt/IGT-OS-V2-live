// @ts-nocheck
import React from "react";
import { GripHorizontal } from "lucide-react";

interface Props {
  compactMode: boolean;
  teamMembers: any[];
  activeTasks: any[];
  today: Date;
}

const TeamTasksWidget = React.memo(function TeamTasksWidget({
  compactMode,
  teamMembers,
  activeTasks,
  today,
}: Props) {
  return (
    <div
      className={`overflow-hidden h-full h-full w-full border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm overflow-y-auto custom-scrollbar ${compactMode ? "p-3" : "p-5"}`}
    >
      {" "}
      <h3 className="font-semibold mb-4 text-[var(--c-text)] flex items-center gap-2">
        {" "}
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
        Team-wise Tasks
      </h3>
      <div className="flex flex-col gap-3">
        {teamMembers.map((m: any) => {
          const mTasks = activeTasks.filter((t: any) =>
            t.assignedTo?.includes(m.id),
          );
          if (mTasks.length === 0) return null;

          const mDueToday = mTasks.filter((t: any) => {
            if (!t.deadline) return false;
            const deadlineDate = new Date(t.deadline);
            deadlineDate.setHours(0, 0, 0, 0);
            return deadlineDate.getTime() === today.getTime();
          });
          const mOverdue = mTasks.filter((t: any) => {
            if (!t.deadline) return false;
            const deadlineDate = new Date(t.deadline);
            deadlineDate.setHours(0, 0, 0, 0);
            return deadlineDate.getTime() < today.getTime();
          });
          return (
            <div key={m.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span
                  className="text-sm font-medium"
                  style={{ color: m.color || "var(--c-text)" }}
                >
                  {m.name || m.email}
                </span>
                <div className="flex gap-2 text-xs font-medium">
                  <span className="text-[var(--c-text-2)]">
                    {mTasks.length} Active
                  </span>
                  {mDueToday.length > 0 && (
                    <span className="text-amber-500">
                      {mDueToday.length} Due
                    </span>
                  )}
                  {mOverdue.length > 0 && (
                    <span className="text-red-500">{mOverdue.length} Late</span>
                  )}
                </div>
              </div>
              <div className="w-full h-1.5 bg-[var(--c-surface)] rounded-full overflow-hidden flex">
                {mOverdue.length > 0 && (
                  <div
                    style={{
                      width: `${(mOverdue.length / mTasks.length) * 100}%`,
                    }}
                    className="bg-red-500 h-full"
                  ></div>
                )}
                {mDueToday.length > 0 && (
                  <div
                    style={{
                      width: `${(mDueToday.length / mTasks.length) * 100}%`,
                    }}
                    className="bg-amber-500 h-full"
                  ></div>
                )}
                {mTasks.length - mDueToday.length - mOverdue.length > 0 && (
                  <div className="bg-blue-500 h-full flex-1"></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default TeamTasksWidget;
