// @ts-nocheck
import React from "react";
import Link from "next/link";
import { GripHorizontal } from "lucide-react";

interface Props {
  compactMode: boolean;
  router: any;
}

export default function CampaignsWidget({ compactMode, router }: Props) {
  return (
    <>
      {" "}
      {/* Module 7: Campaign Health (Simplified) */}{" "}
      <div className="overflow-hidden w-full h-full border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] p-5 flex flex-col shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2">
        <div className="drag-handle cursor-move p-1 -m-1 hover:bg-[var(--c-surface-2)] rounded transition-colors">
          <GripHorizontal className="w-4 h-4 text-[var(--c-text-3)]" />
        </div>
            <svg
              className="w-5 h-5 text-cyan-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
              />
            </svg>
            Ad Campaigns
          </h3>
          <Link
            href="/campaigns"
            className="text-xs font-semibold text-[var(--c-text-2)] hover:text-[var(--c-text)]"
          >
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 flex-1">
          <div
            className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-4 flex flex-col justify-center items-center cursor-pointer hover:bg-[var(--c-surface-3)] transition-colors text-center"
            onClick={() => router.push("/campaigns")}
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined">campaign</span>
            </div>
            <div className="font-bold text-[var(--c-text)]">Meta Ads</div>
            <div className="text-xs text-[var(--c-text-2)] mt-1">12 Active</div>
            <div className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded mt-2 font-bold">
              Healthy
            </div>
          </div>

          <div
            className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-4 flex flex-col justify-center items-center cursor-pointer hover:bg-[var(--c-surface-3)] transition-colors text-center"
            onClick={() => router.push("/campaigns")}
          >
            <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined">ads_click</span>
            </div>
            <div className="font-bold text-[var(--c-text)]">Google Ads</div>
            <div className="text-xs text-[var(--c-text-2)] mt-1">8 Active</div>
            <div className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded mt-2 font-bold">
              Healthy
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
