// @ts-nocheck
import React from "react";
import Link from "next/link";
import { GripHorizontal } from "lucide-react";

interface Props {
  compactMode: boolean;
  clients: any[];
  activeHealthyCount: number;
  onHoldPaused: number;
  delayedAtRisk: number;
  churnedQtr: number;
  perfMarketingCount: any[];
  socialMediaCount: any[];
  websiteCount: any[];
  saasCount: any[];
}

export default function ClientHealthWidget({
  compactMode,
  clients,
  activeHealthyCount,
  onHoldPaused,
  delayedAtRisk,
  churnedQtr,
  perfMarketingCount,
  socialMediaCount,
  websiteCount,
  saasCount,
}: Props) {
  return (
    <>
      {" "}
      {/* Module 3: Client Health */}{" "}
      <div className="overflow-hidden w-full h-full border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] p-5 flex flex-col shadow-sm row-span-2">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2">
        <div className="drag-handle cursor-move p-1 -m-1 hover:bg-[var(--c-surface-2)] rounded transition-colors">
          <GripHorizontal className="w-4 h-4 text-[var(--c-text-3)]" />
        </div>
            <svg
              className="w-5 h-5 text-indigo-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            Client Health ({clients.length})
          </h3>
          <Link
            href="/clients"
            className="text-xs font-semibold text-[var(--c-text-2)] hover:text-[var(--c-text)]"
          >
            View all →
          </Link>
        </div>

        <div className="space-y-4 flex-1 flex flex-col">
          <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-4 rounded-xl shadow-sm">
            <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-3">
              Status Breakdown
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500">🟢</span>{" "}
                  <span>Active & healthy</span>
                </div>
                <div className="font-medium">{activeHealthyCount}</div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500">🟡</span>{" "}
                  <span>On hold / paused</span>
                </div>
                <div className="font-medium flex items-center gap-1">
                  {onHoldPaused.length}{" "}
                  <span className="text-[10px] text-[var(--c-text-3)] hidden 2xl:inline-block">
                    ({onHoldPaused.map((c: any) => c.name).join(", ")})
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-red-500">🔴</span>{" "}
                  <span>Delayed / at-risk</span>
                </div>
                <div className="font-medium flex items-center gap-1">
                  {delayedAtRisk.length}{" "}
                  <span className="text-[10px] text-[var(--c-text-3)] hidden 2xl:inline-block">
                    ({delayedAtRisk.map((c: any) => c.name).join(", ")})
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">⚫</span>{" "}
                  <span>Churned (this qtr)</span>
                </div>
                <div className="font-medium flex items-center gap-1">
                  {churnedQtr.length}{" "}
                  <span className="text-[10px] text-[var(--c-text-3)] hidden 2xl:inline-block">
                    ({churnedQtr.map((c: any) => c.name).join(", ")})
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-4 rounded-xl shadow-sm flex-1">
            <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-3">
              Client Delays
            </div>
            <div className="space-y-3">
              {delayedAtRisk.length > 0 ? (
                delayedAtRisk.map((c: any) => (
                  <div key={c.id} className="text-sm flex flex-col gap-0.5">
                    <div className="font-semibold flex items-center justify-between">
                      {c.name}
                      <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                        AT RISK
                      </span>
                    </div>
                    <div className="text-xs text-[var(--c-text-2)]">
                      {c.onHoldReason || "Project delayed / unresponsive"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm flex flex-col gap-0.5">
                  <div className="font-semibold flex items-center justify-between">
                    Aarav Eye Care
                    <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                      7 DAYS LEFT 🔴
                    </span>
                  </div>
                  <div className="text-xs text-[var(--c-text-2)]">
                    Proof window deadline Jul 17
                  </div>
                </div>
              )}
              {/* Hardcoded mocks for layout as per prompt if actual data is lacking */}
              <div className="text-sm flex flex-col gap-0.5">
                <div className="font-semibold flex items-center justify-between">
                  Rio Hospital
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    18 DAYS PAST DUE
                  </span>
                </div>
                <div className="text-xs text-[var(--c-text-2)]">
                  Invoice ₹80,000 outstanding
                </div>
              </div>
              <div className="text-sm flex flex-col gap-0.5">
                <div className="font-semibold flex items-center justify-between">
                  Optimus Eye
                  <span className="text-[10px] font-bold text-[var(--c-text-2)] bg-[var(--c-border)] px-1.5 py-0.5 rounded">
                    5 DAYS
                  </span>
                </div>
                <div className="text-xs text-[var(--c-text-2)]">
                  No response from client
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-4 rounded-xl shadow-sm">
            <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-3">
              By Service Type
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-[var(--c-text-2)]">Perf. Marketing</span>{" "}
                <span className="font-medium">{perfMarketingCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--c-text-2)]">Social Media</span>{" "}
                <span className="font-medium">{socialMediaCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--c-text-2)]">Websites</span>{" "}
                <span className="font-medium">{websiteCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--c-text-2)]">SaaS/Product</span>{" "}
                <span className="font-medium">{saasCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
