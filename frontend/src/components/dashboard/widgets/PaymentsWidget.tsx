// @ts-nocheck
import React from "react";
import Link from "next/link";
import { GripHorizontal } from "lucide-react";

interface Props {
  compactMode: boolean;
  clients: any[];
  currentCyclePayments: any[];
  olderUnpaidClaims: any[];
  totalCollected: number;
  totalDue: number;
  financeVisible: boolean;
  screenShareMode: boolean;
  setFinanceIdleTimer: (val: number) => void;
  toggleFinanceVisible: () => void;
  renderMoney: (amount: number) => string;
  financeBlur: string;
}

export default function PaymentsWidget({
  compactMode,
  clients,
  currentCyclePayments,
  olderUnpaidClaims,
  totalCollected,
  totalDue,
  financeVisible,
  screenShareMode,
  setFinanceIdleTimer,
  toggleFinanceVisible,
  renderMoney,
  financeBlur,
}: Props) {
  const totalOutstanding =
    currentCyclePayments.reduce((acc: number, c: any) => acc + c.amount, 0) +
    olderUnpaidClaims.reduce((acc: number, c: any) => acc + c.amount, 0);
  return (
    <>
      {" "}
      {/* Module 4: Payment Tracking */}{" "}
      <div className="overflow-hidden w-full h-full border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] p-5 flex flex-col shadow-sm row-span-2">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2">
        <div className="drag-handle cursor-move p-1 -m-1 hover:bg-[var(--c-surface-2)] rounded transition-colors">
          <GripHorizontal className="w-4 h-4 text-[var(--c-text-3)]" />
        </div>
            <svg
              className="w-5 h-5 text-emerald-500"
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
            Payments
          </h3>
          <Link
            href="/finance"
            className="text-xs font-semibold text-[var(--c-text-2)] hover:text-[var(--c-text)]"
          >
            View finance →
          </Link>
        </div>

        <div className="space-y-4 flex-1 flex flex-col">
          <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-4 rounded-xl shadow-sm flex-1 flex flex-col">
            <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-3">
              Recurring — Current Cycle (July 2026)
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto max-h-48 pr-1 custom-scrollbar -mx-1 px-1">
              {currentCyclePayments.map((p: any) => {
                const clientName =
                  clients.find((c: any) => c.id === p.clientId)?.name ||
                  p.clientId;
                const isPaid = p.status === "paid";
                const isPartial = p.status === "partial";
                const isPending = p.status === "pending";
                const isOverdue = p.status === "overdue";

                const totalOutstanding =
                  currentCyclePayments.reduce(
                    (acc: number, c: any) => acc + c.amount,
                    0,
                  ) +
                  olderUnpaidClaims.reduce(
                    (acc: number, c: any) => acc + c.amount,
                    0,
                  );
                return (
                  <div
                    key={p.id}
                    className="flex justify-between items-center text-sm border-b border-[var(--c-border)] pb-2 last:border-0 last:pb-0"
                  >
                    <div className="font-medium truncate w-1/3">
                      {clientName}
                    </div>
                    <div className="w-1/4 text-right">
                      <span className={financeBlur}>
                        ₹{p.amountDue.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-1/3 text-right text-xs">
                      {isPaid && (
                        <span className="text-emerald-500 font-bold">
                          ✅ Paid
                        </span>
                      )}
                      {isPartial && (
                        <span className="text-amber-500 font-bold">
                          🟡 Partial{" "}
                          <span className={financeBlur}>
                            ₹{Math.floor(p.amountPaid / 1000)}K
                          </span>
                        </span>
                      )}
                      {isPending && (
                        <span className="text-[var(--c-text-2)] font-bold">
                          ⏳ Pending
                        </span>
                      )}
                      {isOverdue && (
                        <span className="text-red-500 font-bold">
                          🔴 Overdue {p.overduedays}d
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-[var(--c-border)] space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-[var(--c-text-2)]">
                  TOTAL COLLECTED:
                </span>
                <span className="font-bold">
                  <span className={financeBlur}>
                    ₹{totalCollected.toLocaleString()} / ₹
                    {totalDue.toLocaleString()}
                  </span>{" "}
                  (
                  {totalDue > 0
                    ? Math.round((totalCollected / totalDue) * 100)
                    : 0}
                  %)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-[var(--c-text-2)]">
                  OUTSTANDING:
                </span>
                <span className="font-bold text-red-500">
                  <span className={financeBlur}>
                    ₹{totalOutstanding.toLocaleString()}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-4 rounded-xl shadow-sm">
            <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-3">
              Unpaid Claims (Older Cycles)
            </div>
            <div className="space-y-2">
              {olderUnpaidClaims.length > 0 ? (
                olderUnpaidClaims.map((p: any) => {
                  const clientName =
                    clients.find((c: any) => c.id === p.clientId)?.name ||
                    p.clientId;
                  const totalOutstanding =
                    currentCyclePayments.reduce(
                      (acc: number, c: any) => acc + c.amount,
                      0,
                    ) +
                    olderUnpaidClaims.reduce(
                      (acc: number, c: any) => acc + c.amount,
                      0,
                    );
                  return (
                    <div
                      key={p.id}
                      className="text-sm flex justify-between items-center bg-red-500/5 p-2 rounded border border-red-500/10"
                    >
                      <div>
                        <span className="font-semibold">{clientName}</span> —{" "}
                        <span className="text-[var(--c-text-2)]">
                          {p.cycleMonth} invoice{" "}
                          <span className={financeBlur}>
                            ₹{p.amountDue.toLocaleString()}
                          </span>
                        </span>
                      </div>
                      <div className="text-xs font-bold text-red-500">
                        {p.overduedays}d overdue 🔴
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-[var(--c-text-2)]">
                  No older unpaid claims.
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 bg-[var(--c-border)] hover:bg-[var(--c-surface-3)] text-xs font-semibold py-2 rounded-lg transition-colors text-[var(--c-text)]">
                Send reminders →
              </button>
              <button className="flex-1 bg-[var(--c-text)] hover:bg-[var(--c-text-2)] text-[var(--c-bg)] text-xs font-semibold py-2 rounded-lg transition-colors">
                Mark paid →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
