'use client';

import React, { useState } from 'react';
import { Download } from 'lucide-react';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Staff-only month-end report download. The report is built server-side from database records only
// (see backend/src/routes/reports.ts); failures are shown, never swallowed.
export default function MonthlyReportButton({ clientId }: { clientId: string }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/reports/monthly?clientId=${encodeURIComponent(clientId)}&month=${month}`, { credentials: 'include' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Report failed (${res.status})`);
      const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')?.[1] || `igt-report-${month}.csv`;
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || 'Could not generate the report');
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="report-month">Report month</label>
        <input id="report-month" type="month" value={month} max={new Date().toISOString().slice(0, 7)} onChange={e => setMonth(e.target.value)}
          className="rounded-lg border border-[var(--c-border)] bg-[var(--c-input)] px-2 py-1.5 text-sm text-[var(--c-text)]" />
        <button type="button" onClick={download} disabled={busy || !month}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--c-border-strong)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-hover)] disabled:opacity-50">
          <Download className="h-4 w-4" aria-hidden /> {busy ? 'Preparing…' : 'Monthly report (CSV)'}
        </button>
      </div>
      {error && <p role="alert" className="text-xs" style={{ color: 'var(--c-error)' }}>{error}</p>}
    </div>
  );
}
