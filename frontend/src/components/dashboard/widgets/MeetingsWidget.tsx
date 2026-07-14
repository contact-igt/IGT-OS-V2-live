// @ts-nocheck
import React from "react";
import Link from "next/link";
import { GripHorizontal } from "lucide-react";

interface Props {
  compactMode: boolean;
  router: any;
  todayMeetings: any[];
}

const MeetingsWidget = React.memo(function MeetingsWidget({
  compactMode,
  router,
  todayMeetings,
}: Props) {
  return (
    <>
      {" "}
      {/* Module 6: Meetings Today */}{" "}
      <div className="overflow-hidden w-full h-full border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] p-5 flex flex-col shadow-sm">
        <h3 className="font-semibold mb-4 text-[var(--c-text)] flex items-center gap-2">
        <div className="drag-handle cursor-move p-1 -m-1 hover:bg-[var(--c-surface-2)] rounded transition-colors">
          <GripHorizontal className="w-4 h-4 text-[var(--c-text-3)]" />
        </div>
          <svg
            className="w-5 h-5 text-orange-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Meetings Today
        </h3>
        <div className="space-y-2 overflow-y-auto max-h-48 pr-1 custom-scrollbar -mx-1 px-1">
          {todayMeetings.length > 0 ? (
            todayMeetings.map((m: any, i: number) => {
              const d = new Date(m.date || m.startTime);
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-[var(--c-surface)] p-3 rounded-lg border border-[var(--c-border)] shadow-sm cursor-pointer hover:bg-[var(--c-surface-3)] transition-colors"
                  onClick={() =>
                    router.push(`/calendar?date=today&eventId=${m.id}`)
                  }
                >
                  <div className="shrink-0 text-center border-r border-[var(--c-border)] pr-3">
                    <div
                      className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded"
                      suppressHydrationWarning
                    >
                      {d.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {m.title || "Meeting"}
                    </div>
                    <div className="text-xs font-medium text-[var(--c-text-2)] truncate">
                      {m.client || m.attendees?.join(", ") || "Internal"}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-[var(--c-text-2)] bg-[var(--c-surface)] border border-[var(--c-border)] rounded-lg">
              <svg
                className="w-8 h-8 mb-2 opacity-20"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <div className="text-sm font-medium">No meetings today</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
});

export default MeetingsWidget;
