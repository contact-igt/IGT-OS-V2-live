import React from 'react';

// Data provenance classes (docs/igt-os/DATA_PROVENANCE.md). Every management-facing number should carry one.
export type Provenance = 'LIVE API' | 'DATABASE' | 'DERIVED' | 'VALIDATED MANUAL IMPORT' | 'DEMO / SEED' | 'UNKNOWN' | 'ACCESS REQUIRED';

const TONE: Record<Provenance, string> = {
  'LIVE API': 'var(--c-success)',
  DATABASE: 'var(--c-info)',
  DERIVED: 'var(--c-info)',
  'VALIDATED MANUAL IMPORT': 'var(--c-info)',
  'DEMO / SEED': 'var(--c-warning)',
  UNKNOWN: 'var(--c-warning)',
  'ACCESS REQUIRED': 'var(--c-error)',
};

export default function ProvenanceBadge({ kind, note }: { kind: Provenance; note?: string }) {
  return (
    <span
      title={note}
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap"
      style={{ color: TONE[kind], borderColor: TONE[kind] }}
    >
      {kind}
    </span>
  );
}
