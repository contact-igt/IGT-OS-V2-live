// @ts-nocheck
import React from "react";
import Link from "next/link";
import { GripHorizontal } from "lucide-react";

interface Props {
  compactMode: boolean;
  state?: any;
}

export default function SocialMediaWidget({ compactMode, state }: Props) {
  const accounts = state?.socialAccounts || [];
  const totalReach = accounts.reduce((acc: number, a: any) => acc + (a.reach || a.views || 0), 0);
  const avgEngagement = accounts.length > 0
    ? accounts.reduce((acc: number, a: any) => acc + (a.engagementRate || 0), 0) / accounts.length
    : 0;

  const igFollowers = accounts.filter((a: any) => a.platform === 'instagram').reduce((acc: number, a: any) => acc + (a.followers || 0), 0);
  const ytFollowers = accounts.filter((a: any) => a.platform === 'youtube').reduce((acc: number, a: any) => acc + (a.followers || 0), 0);
  const totalFollowers = igFollowers + ytFollowers;
  const igShare = totalFollowers > 0 ? Math.round((igFollowers / totalFollowers) * 100) : 0;
  const ytShare = totalFollowers > 0 ? 100 - igShare : 0;

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
                {totalReach >= 1000000 ? (totalReach / 1000000).toFixed(1) + "M" : (totalReach / 1000).toFixed(1) + "K"}
              </div>
              <div className="text-[10px] text-[var(--c-text-3)] font-medium mt-1">
                {accounts.length > 0 ? `${accounts.length} account${accounts.length === 1 ? '' : 's'} tracked` : 'No accounts connected'}
              </div>
            </div>
            <div className="bg-[var(--c-surface)] p-3 rounded-lg border border-[var(--c-border)] shadow-sm">
              <div className="text-[var(--c-text-2)] text-xs font-semibold uppercase mb-1">
                Engagement Rate
              </div>
              <div className="text-2xl font-bold">
                {avgEngagement.toFixed(1)}%
              </div>
              <div className="text-[10px] text-[var(--c-text-3)] font-medium mt-1">
                Avg across channels
              </div>
            </div>
          </div>

          <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-4 rounded-xl shadow-sm flex-1 flex flex-col">
            <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-3">
              Platform Split (by followers)
            </div>
            {totalFollowers === 0 ? (
              <div className="text-xs text-[var(--c-text-3)] italic">No follower data yet — connect an account and sync.</div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span>Instagram</span>
                    <span>{igShare}%</span>
                  </div>
                  <div className="w-full bg-[var(--c-border)] rounded-full h-1.5">
                    <div className="bg-pink-500 h-1.5 rounded-full" style={{ width: `${igShare}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span>YouTube</span>
                    <span>{ytShare}%</span>
                  </div>
                  <div className="w-full bg-[var(--c-border)] rounded-full h-1.5">
                    <div className="bg-red-600 h-1.5 rounded-full" style={{ width: `${ytShare}%` }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
