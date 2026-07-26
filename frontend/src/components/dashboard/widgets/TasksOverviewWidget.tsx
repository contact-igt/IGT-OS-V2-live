// @ts-nocheck
import React from "react";
import Link from "next/link";
import { GripHorizontal } from "lucide-react";

interface Props {
  compactMode: boolean;
  activeTasks: any[];
  tasksDueToday: any[];
  tasksOverdue: any[];
  tasksInReview: any[];
  totalTasks: any[];
}

const TasksOverviewWidget = React.memo(function TasksOverviewWidget({
  compactMode,
  activeTasks,
  tasksDueToday,
  tasksOverdue,
  tasksInReview,
  totalTasks,
}: Props) {
  return (
    <div
      className={`overflow-hidden h-full h-full w-full border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm ${compactMode ? "p-3" : "p-5"}`}
    >
      {" "}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2">
          <div className="drag-handle cursor-move p-1 -m-1 hover:bg-[var(--c-surface-2)] rounded transition-colors">
            <GripHorizontal className="w-4 h-4 text-[var(--c-text-3)]" />
          </div>
          <svg
            className="w-5 h-5 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          Tasks Overview
        </h3>
        <Link
          href="/tasks"
          className="text-xs font-semibold text-[var(--c-text-2)] hover:text-[var(--c-text)]"
        >
          View all →
        </Link>
      </div>
      {!compactMode && (
        <div className="flex-1 flex flex-col justify-center mb-4 px-2">
          <div className="text-xs text-[var(--c-text-2)] mb-2 flex justify-between">
            <span>Completion Rate (This Week)</span>
            <span className="font-bold text-[var(--c-text)]">68%</span>
          </div>
          <div className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full"
              style={{ width: "68%" }}
            ></div>
          </div>
        </div>
      )}
      <div className={`flex flex-col mt-auto overflow-y-auto custom-scrollbar min-h-0 ${compactMode ? "gap-2" : "gap-3"}`}>
        <Link href="/tasks" className="block bg-[var(--c-surface)] p-3 rounded-lg border border-[var(--c-border)] shadow-sm hover:border-[var(--c-text-3)] transition-colors">
          <div className="text-[var(--c-text-2)] text-xs font-semibold uppercase mb-1">
            Total
          </div>
          <div className="text-2xl font-bold">{totalTasks.length}</div>
        </Link>
        <div className={`grid grid-cols-2 ${compactMode ? "gap-2" : "gap-3"}`}>
          <Link href="/tasks?status=active" className="block bg-[var(--c-surface)] p-3 rounded-lg border border-[var(--c-border)] shadow-sm hover:border-[var(--c-text-3)] transition-colors">
            <div className="text-[var(--c-text-2)] text-xs font-semibold uppercase mb-1">
              In Progress
            </div>
            <div className="text-2xl font-bold">{activeTasks.length}</div>
          </Link>
          <Link href="/tasks?status=due-today" className="block bg-[var(--c-surface)] p-3 rounded-lg border border-[var(--c-border)] shadow-sm hover:border-[var(--c-text-3)] transition-colors">
            <div className="text-[var(--c-text-2)] text-xs font-semibold uppercase mb-1">
              Due Today
            </div>
            <div className="text-2xl font-bold text-amber-500">
              {tasksDueToday.length}
            </div>
          </Link>
          <Link href="/tasks?status=overdue" className="block bg-[var(--c-surface)] p-3 rounded-lg border border-[var(--c-border)] shadow-sm hover:border-[var(--c-text-3)] transition-colors">
            <div className="text-[var(--c-text-2)] text-xs font-semibold uppercase mb-1">
              Overdue
            </div>
            <div className="text-2xl font-bold text-red-500">
              {tasksOverdue.length}
            </div>
          </Link>
          <Link href="/tasks?status=in-review" className="block bg-[var(--c-surface)] p-3 rounded-lg border border-[var(--c-border)] shadow-sm hover:border-[var(--c-text-3)] transition-colors">
            <div className="text-[var(--c-text-2)] text-xs font-semibold uppercase mb-1">
              In Review
            </div>
            <div className="text-2xl font-bold text-blue-500">
              {tasksInReview.length}
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
});

export default TasksOverviewWidget;
