// @ts-nocheck
import React from "react";
import Link from "next/link";
import { GripHorizontal } from "lucide-react";

interface Props {
  compactMode: boolean;
  financeVisible: boolean;
  screenShareMode: boolean;
  renderMoney: (amount: number) => string;
  financeBlur: string;
}

export default function FinancialsWidget({
  compactMode,
  financeVisible,
  screenShareMode,
  renderMoney,
  financeBlur,
}: Props) {
  return (
    <div
      className={`overflow-hidden h-full h-full w-full border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] p-5 flex flex-col shadow-sm relative overflow-hidden`}
    >
      {" "}
      <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      <div className="flex justify-between items-center mb-4 relative z-10">
        <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2">
        <div className="drag-handle cursor-move p-1 -m-1 hover:bg-[var(--c-surface-2)] rounded transition-colors">
          <GripHorizontal className="w-4 h-4 text-[var(--c-text-3)]" />
        </div>
          <svg
            className="w-5 h-5 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Financials
          <span className="text-[10px] font-bold uppercase bg-yellow-500/10 text-yellow-600 px-1.5 py-0.5 rounded border border-yellow-500/20 ml-2 tracking-wider">
            Admin
          </span>
        </h3>
        <div className="flex items-center gap-2">
          {screenShareMode && (
            <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
              Screen Share Active
            </span>
          )}
        </div>
      </div>
      <div
        className={`flex flex-col gap-4 flex-1 relative z-10 transition-all duration-300 ${financeBlur}`}
      >
        {/* Collected MTD */}
        <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-end mb-2">
            <div>
              <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-1">
                Collected (MTD)
              </div>
              <div className="text-3xl font-bold tracking-tight">₹4.2L</div>
            </div>
            <div className="text-sm font-medium text-[var(--c-text-2)] mb-1">
              Target: <span className="text-[var(--c-text)]">₹8.0L</span>
            </div>
          </div>
          <div className="w-full bg-[var(--c-border)] rounded-full h-2 mt-3">
            <div
              className="bg-yellow-500 h-2 rounded-full"
              style={{ width: "52.5%" }}
            ></div>
          </div>
        </div>

        {/* Projections Graph */}
        <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-4 rounded-xl shadow-sm flex-1 flex flex-col min-h-[120px]">
          <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-3">
            Revenue Projection (Jul-Dec)
          </div>
          <div className="flex items-end justify-between gap-2 flex-1 mt-2">
            {[1.0, 1.05, 1.12, 1.18, 1.25, 1.35].map((mult, idx) => {
              const baseMrr = 420000; // Base ₹4.2L
              const val = baseMrr * mult;
              const height = Math.min(100, Math.max(20, (mult - 0.5) * 100));
              const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              return (
                <div
                  key={idx}
                  className="flex flex-col items-center flex-1 group h-full justify-end"
                >
                  <div
                    className="w-full bg-yellow-500/20 rounded-t-sm group-hover:bg-yellow-500/40 transition-colors relative"
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[var(--c-text)] text-[var(--c-bg)] text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 font-bold pointer-events-none">
                      ₹{(val / 100000).toFixed(1)}L
                    </div>
                  </div>
                  <div className="text-[10px] font-medium text-[var(--c-text-2)] mt-1">
                    {months[idx]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
