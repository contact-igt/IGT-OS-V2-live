interface Invoice {
  id: string;
  clientName: string;
  invoiceNo: string;
  raisedDate: string;
  daysOut: number;
  amount: number;
}

interface CollectionsTrackerProps {
  invoices: Invoice[];
}

export function CollectionsTracker({ invoices }: CollectionsTrackerProps) {
  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-[var(--c-border)]">
        <h3 className="font-syne font-bold text-[var(--c-text)] text-sm tracking-wider uppercase">
          OUTSTANDING INVOICES
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--c-surface-2)]">
              <th className="px-6 py-3 text-xs font-semibold text-[var(--c-text-2)] uppercase">Client</th>
              <th className="px-6 py-3 text-xs font-semibold text-[var(--c-text-2)] uppercase">Invoice</th>
              <th className="px-6 py-3 text-xs font-semibold text-[var(--c-text-2)] uppercase">Raised</th>
              <th className="px-6 py-3 text-xs font-semibold text-[var(--c-text-2)] uppercase">Days Out</th>
              <th className="px-6 py-3 text-xs font-semibold text-[var(--c-text-2)] uppercase text-right">Amount</th>
              <th className="px-6 py-3 text-xs font-semibold text-[var(--c-text-2)] uppercase text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--c-border)]">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-[var(--c-text-3)] text-sm">
                  No outstanding invoices.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-[var(--c-hover)] transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-[var(--c-text)]">{inv.clientName}</td>
                  <td className="px-6 py-3 text-sm text-[var(--c-text-2)]">{inv.invoiceNo}</td>
                  <td className="px-6 py-3 text-sm text-[var(--c-text-2)]">{inv.raisedDate}</td>
                  <td className="px-6 py-3 text-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                      inv.daysOut > 30 ? 'bg-red-500/10 text-red-500' :
                      inv.daysOut > 14 ? 'bg-amber-500/10 text-amber-500' :
                      'bg-slate-500/10 text-slate-500'
                    }`}>
                      {inv.daysOut}d
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm font-semibold text-[var(--c-text)] text-right">
                    ₹{inv.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-3 text-sm text-center">
                    <button className="text-[var(--c-primary)] font-semibold hover:underline text-xs">
                      [Chase →]
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-[var(--c-surface-2)] border-t border-[var(--c-border)]">
            <tr>
              <td colSpan={4} className="px-6 py-4 text-sm font-bold text-[var(--c-text)] uppercase text-right">
                TOTAL OUTSTANDING:
              </td>
              <td className="px-6 py-4 text-sm font-bold text-[var(--c-text)] text-right">
                ₹{totalOutstanding.toLocaleString('en-IN')}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
