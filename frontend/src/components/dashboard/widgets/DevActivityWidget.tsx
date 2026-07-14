// @ts-nocheck
import React from "react";
import Link from "next/link";
import { GripHorizontal } from "lucide-react";

interface Props {
  compactMode: boolean;
  githubActivity: any[];
  githubRepos: any[];
  teamMembers: any[];
}

export default function DevActivityWidget({
  compactMode,
  githubActivity,
  githubRepos,
  teamMembers,
}: Props) {
  return (
    <>
      {" "}
      {/* Module 8: Dev Activity */}{" "}
      <div className="overflow-hidden w-full h-full border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] p-5 flex flex-col shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2">
        <div className="drag-handle cursor-move p-1 -m-1 hover:bg-[var(--c-surface-2)] rounded transition-colors">
          <GripHorizontal className="w-4 h-4 text-[var(--c-text-3)]" />
        </div>
            <svg
              className="w-5 h-5 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
            Dev Activity
          </h3>
          <Link
            href="/development"
            className="text-xs font-semibold text-[var(--c-text-2)] hover:text-[var(--c-text)]"
          >
            Full dev view →
          </Link>
        </div>

        <div className="space-y-4 flex-1 flex flex-col">
          {/* Heatmap */}
          <div
            className="flex gap-[3px] overflow-x-auto pb-1"
            style={{ maxWidth: "100%" }}
          >
            {Array.from({ length: 60 }).map((_, i) => {
              // Generate a deterministic pseudo-random contribution pattern
              const isWeekend = i % 7 === 0 || i % 7 === 6;
              const baseProb = isWeekend ? 0.2 : 0.8;
              let val = 0;
              // pseudo-random using index so it's stable across SSR and Client
              const pseudoRand = ((i * 17) % 100) / 100;
              if (pseudoRand < baseProb) {
                val = ((i * 13) % 4) + 1;
              }
              const colors = [
                "bg-[var(--c-surface)]",
                "bg-emerald-500/30",
                "bg-emerald-500/60",
                "bg-emerald-500/80",
                "bg-emerald-500",
              ];
              return (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-[2px] ${colors[val]} flex-shrink-0`}
                  title={`${val} contributions`}
                />
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto max-h-48 pr-1 custom-scrollbar -mx-1 px-1">
            <div className="w-full text-left border-collapse min-w-[400px]">
              <div className="flex items-center text-[10px] font-semibold text-[var(--c-text-2)] uppercase border-b border-[var(--c-border)] pb-2 mb-2">
                <div className="w-[15%]">Developer</div>
                <div className="w-[25%]">Repo</div>
                <div className="w-[20%]">Client</div>
                <div className="w-[15%]">Task</div>
                <div className="w-[15%]">When</div>
                <div className="w-[10%] text-right">Commits</div>
              </div>
              {githubActivity.map((act: any, i: number) => {
                const memberName =
                  teamMembers
                    .find((m: any) => m.id === act.userId)
                    ?.name?.split(" ")[0] || "Dev";
                const repoName =
                  githubRepos.find((r: any) => r.id === act.repoId)?.name ||
                  "repo";
                const isBlocked = i === 2; // Mocking block warning based on prompt
                return (
                  <div
                    key={i}
                    className="flex items-center text-xs py-2 border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-surface)] cursor-pointer transition-colors -mx-2 px-2 rounded"
                  >
                    <div className="w-[15%] font-semibold truncate pr-2">
                      {memberName}
                    </div>
                    <div className="w-[25%] text-blue-500 hover:underline truncate pr-2">
                      {repoName}
                    </div>
                    <div className="w-[20%] truncate pr-2 text-[var(--c-text-2)]">
                      {i === 0
                        ? "Internal"
                        : i === 1
                          ? "Pixel Eye"
                          : "Rio Hospital"}
                    </div>
                    <div className="w-[15%] font-mono text-[10px] text-[var(--c-text-2)]">
                      {i === 2 ? "—" : `TSK-0${15 + i}`}
                    </div>
                    <div className="w-[15%] text-[var(--c-text-2)] flex items-center gap-1">
                      {i === 0 ? "2h ago" : i === 2 ? "3d ago" : "Yesterday"}
                      {isBlocked && (
                        <span
                          className="text-amber-500"
                          title="No recent commits"
                        >
                          ⚠
                        </span>
                      )}
                    </div>
                    <div className="w-[10%] text-right font-medium">
                      {act.commits || 0}/wk
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-sm font-semibold text-[var(--c-text-2)] flex items-center gap-3">
            <span>Active repos: {githubRepos.length}</span>
            <span>/</span>
            <span>
              Open PRs:{" "}
              {githubActivity.reduce(
                (acc: number, act: any) => acc + (act.openPrs || 0),
                0,
              )}
            </span>
            <span>/</span>
            <span className="flex items-center gap-1">
              Blocked: 1 <span className="text-amber-500">⚠</span>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
