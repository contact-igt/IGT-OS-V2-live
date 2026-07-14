'use client';

import { MeetingQuality } from '@/lib/meetingTypes';

const RATING_CONFIG = {
  excellent: { emoji: '🟢', color: '#2AB182', bg: 'rgba(42,177,130,0.1)',  border: 'rgba(42,177,130,0.25)' },
  good:      { emoji: '🟢', color: '#2AB182', bg: 'rgba(42,177,130,0.08)', border: 'rgba(42,177,130,0.2)'  },
  average:   { emoji: '🟡', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
  poor:      { emoji: '🔴', color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'  },
  alarming:  { emoji: '🚨', color: '#EF4444', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.35)'  },
};

const FLAG_LABELS: Record<string, string> = {
  client_dissatisfied: 'Client Dissatisfied',
  talk_imbalance:      'Talk Imbalance',
  no_next_step:        'No Next Step',
  budget_dispute:      'Budget Dispute',
  decision_conflict:   'Decision Conflict',
  client_silent:       'Client Silent',
  meeting_derailed:    'Meeting Derailed',
  deal_at_risk:        'Deal at Risk',
  scope_change:        'Scope Change',
  payment_mentioned:   'Payment Mentioned',
};

interface Props {
  quality: MeetingQuality;
}

export default function MeetingQualityBadge({ quality }: Props) {
  const cfg = RATING_CONFIG[quality.rating] || RATING_CONFIG.average;

  return (
    <div 
      className="rounded-xl p-4"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {/* Score + rating row */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black" style={{ color: cfg.color }}>{quality.score}</span>
          <span className="text-lg font-bold" style={{ color: cfg.color }}>/10</span>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-base">{cfg.emoji}</span>
            <span className="text-[15px] font-bold capitalize" style={{ color: cfg.color }}>
              {quality.rating}
            </span>
          </div>
          <p className="text-[12px]" style={{ color: 'var(--c-text-3)' }}>Meeting Quality Score</p>
        </div>

        {/* Score bar */}
        <div className="flex-1 ml-4">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--c-surface-2)' }}>
            <div 
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${quality.score * 10}%`, background: cfg.color }}
            />
          </div>
        </div>
      </div>

      {/* Narrative */}
      {quality.narrative && (
        <p className="text-[13px] mb-3 leading-relaxed" style={{ color: 'var(--c-text-2)' }}>
          {quality.narrative}
        </p>
      )}

      {/* Flags */}
      {quality.flags && quality.flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {quality.flags.map(flag => (
            <span
              key={flag}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              ⚠ {FLAG_LABELS[flag] || flag}
            </span>
          ))}
        </div>
      )}

      {/* Positives */}
      {quality.positives && quality.positives.length > 0 && (
        <div className="space-y-1">
          {quality.positives.map((p, i) => (
            <p key={i} className="text-[12px] flex items-start gap-1.5" style={{ color: '#2AB182' }}>
              <span className="mt-0.5 flex-shrink-0">✓</span> {p}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
