// @ts-nocheck
import React from "react";
import Link from "next/link";
import { GripHorizontal } from "lucide-react";

interface Props {
  compactMode: boolean;
  router: any;
  leads: any[];
  pipelineValue: number;
  leadsInDiscovery: number;
  leadsInProposal: number;
  leadsInReview: number;
  leadsWonThisMonth: number;
  leadsLostThisMonth: number;
}

export default function SalesPipelineWidget({
  compactMode,
  router,
  leads,
  pipelineValue,
  leadsInDiscovery,
  leadsInProposal,
  leadsInReview,
  leadsWonThisMonth,
  leadsLostThisMonth,
}: Props) {
  return (
    <>
      {" "}
      {/* Module 5: Sales Pipeline */}{" "}
      <div className="overflow-hidden w-full h-full border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] p-5 flex flex-col shadow-sm">
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
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            Sales Pipeline
          </h3>
          <Link
            href="/leads"
            className="text-xs font-semibold text-[var(--c-text-2)] hover:text-[var(--c-text)]"
          >
            Full pipeline →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 flex-1">
          <div className="flex flex-col">
            <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-3">
              Funnel
            </div>
            <div className="flex flex-col items-center w-full gap-1 flex-1 cursor-pointer">
              <div
                className={`h-8 flex items-center justify-center font-bold text-[10px] transition-colors hover:opacity-80 ${leadsInDiscovery > 0 ? "bg-emerald-500/20 text-emerald-600" : "bg-[var(--c-surface)] text-[var(--c-text-2)]"}`}
                style={{
                  clipPath: "polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)",
                  width: "100%",
                }}
                onClick={() => router.push("/leads?stage=discovery")}
              >
                DISCOVERY {leadsInDiscovery}
              </div>
              <div
                className={`h-8 flex items-center justify-center font-bold text-[10px] transition-colors hover:opacity-80 ${leadsInProposal > 0 ? "bg-emerald-500/20 text-emerald-600" : "bg-[var(--c-surface)] text-[var(--c-text-2)]"}`}
                style={{
                  clipPath: "polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)",
                  width: "80%",
                }}
                onClick={() => router.push("/leads?stage=proposal")}
              >
                PROPOSAL {leadsInProposal}
              </div>
              <div
                className={`h-8 flex items-center justify-center font-bold text-[10px] transition-colors hover:opacity-80 ${leadsInReview > 0 ? "bg-emerald-500/20 text-emerald-600" : "bg-[var(--c-surface)] text-[var(--c-text-2)]"}`}
                style={{
                  clipPath: "polygon(0% 0%, 100% 0%, 80% 100%, 20% 100%)",
                  width: "56%",
                }}
                onClick={() => router.push("/leads?stage=review")}
              >
                REVIEW {leadsInReview}
              </div>
              <div className="h-4 w-0.5 bg-[var(--c-border)] my-1"></div>
              <Link
                href="/leads"
                className="text-[10px] font-semibold text-[var(--c-text-2)] bg-[var(--c-surface)] px-3 py-1 rounded-full border border-[var(--c-border)] hover:bg-[var(--c-surface-3)]"
              >
                View leads →
              </Link>
            </div>
          </div>

          <div className="flex flex-col text-sm border-l border-[var(--c-border)] pl-4">
            <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-3">
              Metrics
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex justify-between items-center">
                <span className="text-[var(--c-text-2)]">Open leads:</span>{" "}
                <span className="font-medium">{leads.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--c-text-2)]">Value:</span>{" "}
                <span className="font-medium">
                  ₹
                  {pipelineValue >= 100000
                    ? `${(pipelineValue / 100000).toFixed(1)}L`
                    : pipelineValue.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--c-text-2)]">Avg size:</span>{" "}
                <span className="font-medium">
                  ₹
                  {leads.length > 0
                    ? Math.round(pipelineValue / leads.length).toLocaleString()
                    : 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--c-text-2)]">Win rate (90d):</span>{" "}
                <span className="font-medium">31%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--c-text-2)]">Days to close:</span>{" "}
                <span className="font-medium">22d</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-[var(--c-border)] space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[var(--c-text-2)]">WON this month:</span>{" "}
                <span className="font-bold text-emerald-500">
                  {leadsWonThisMonth}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--c-text-2)]">LOST this month:</span>{" "}
                <span className="font-bold text-red-500">
                  {leadsLostThisMonth}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
