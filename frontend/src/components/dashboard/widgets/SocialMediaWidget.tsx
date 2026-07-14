// @ts-nocheck
import React from "react";
import Link from "next/link";
import { GripHorizontal } from "lucide-react";

interface Props {
  compactMode: boolean;
  state?: any;
}

export default function SocialMediaWidget({ compactMode, state }: Props) {
  return (
    <>
      {" "}
      {/* Module 8.5: Social Media Metrics */}{" "}
      <div className="overflow-hidden w-full h-full border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] p-5 flex flex-col shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2">
        <div className="drag-handle cursor-move p-1 -m-1 hover:bg-[var(--c-surface-2)] rounded transition-colors">
          <GripHorizontal className="w-4 h-4 text-[var(--c-text-3)]" />
        </div>
            <svg
              className="w-5 h-5 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
              />
            </svg>
            Social Media Metrics
          </h3>
          <Link
            href="/social"
            className="text-xs font-semibold text-[var(--c-text-2)] hover:text-[var(--c-text)]"
          >
            View insights →
          </Link>
        </div>

        <div className="space-y-4 flex-1 flex flex-col">
          <div className="grid grid-cols-2 gap-3 mt-auto">
            <div className="bg-[var(--c-surface)] p-3 rounded-lg border border-[var(--c-border)] shadow-sm">
              <div className="text-[var(--c-text-2)] text-xs font-semibold uppercase mb-1">
                Total Reach
              </div>
              <div className="text-2xl font-bold text-blue-500">
                {state.socialMetrics
                  ? (
                      state.socialMetrics.reduce(
                        (acc: number, sm: any) => acc + (sm.reach || 0),
                        0,
                      ) / 1000
                    ).toFixed(1) + "K"
                  : "1.2M"}
              </div>
              <div className="text-[10px] text-emerald-500 font-medium mt-1">
                ↑ Active tracking
              </div>
            </div>
            <div className="bg-[var(--c-surface)] p-3 rounded-lg border border-[var(--c-border)] shadow-sm">
              <div className="text-[var(--c-text-2)] text-xs font-semibold uppercase mb-1">
                Engagement Rate
              </div>
              <div className="text-2xl font-bold">
                {state.socialMetrics && state.socialMetrics.length > 0
                  ? (
                      state.socialMetrics.reduce(
                        (acc: number, sm: any) =>
                          acc + (sm.engagementRate || 0),
                        0,
                      ) / state.socialMetrics.length
                    ).toFixed(1) + "%"
                  : "4.8%"}
              </div>
              <div className="text-[10px] text-emerald-500 font-medium mt-1">
                ↑ Across channels
              </div>
            </div>
          </div>

          <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-4 rounded-xl shadow-sm flex-1 flex flex-col">
            <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-3">
              Top Performing Platforms
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>Instagram</span>
                  <span>54%</span>
                </div>
                <div className="w-full bg-[var(--c-border)] rounded-full h-1.5">
                  <div
                    className="bg-pink-500 h-1.5 rounded-full"
                    style={{ width: "54%" }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>LinkedIn</span>
                  <span>32%</span>
                </div>
                <div className="w-full bg-[var(--c-border)] rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full"
                    style={{ width: "32%" }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>X (Twitter)</span>
                  <span>14%</span>
                </div>
                <div className="w-full bg-[var(--c-border)] rounded-full h-1.5">
                  <div
                    className="bg-neutral-800 dark:bg-neutral-300 h-1.5 rounded-full"
                    style={{ width: "14%" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
