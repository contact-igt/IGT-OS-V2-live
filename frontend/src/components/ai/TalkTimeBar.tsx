'use client';

import { TalkParticipant } from '@/lib/meetingTypes';

interface Props {
  participants: TalkParticipant[];
  clientTalkPercent: number;
  invictusTalkPercent: number;
  conversationBalance: string;
  balanceNote: string;
}

const SENTIMENT_STYLES: Record<string, { bg: string; color: string }> = {
  positive:   { bg: 'rgba(42,177,130,0.12)',  color: '#2AB182' },
  neutral:    { bg: 'rgba(100,116,139,0.12)', color: '#94A3B8' },
  cautious:   { bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B' },
  frustrated: { bg: 'rgba(239,68,68,0.12)',   color: '#EF4444' },
  confused:   { bg: 'rgba(249,115,22,0.12)',  color: '#F97316' },
};

const BALANCE_STYLES: Record<string, { label: string; color: string }> = {
  balanced:       { label: 'Balanced',         color: '#2AB182' },
  invictus_heavy: { label: 'Invictus-heavy',   color: '#F59E0B' },
  client_heavy:   { label: 'Client-heavy',     color: '#7C3AED' },
};

export default function TalkTimeBar({ participants, clientTalkPercent, invictusTalkPercent, conversationBalance, balanceNote }: Props) {
  const balance = BALANCE_STYLES[conversationBalance] || BALANCE_STYLES.balanced;

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: '#2AB182' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--c-text-3)' }}>Invictus ({invictusTalkPercent}%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: '#7C3AED' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--c-text-3)' }}>Client ({clientTalkPercent}%)</span>
        </div>
        <span 
          className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${balance.color}18`, color: balance.color }}
        >
          {balance.label}
        </span>
      </div>

      {/* Participant bars */}
      <div className="space-y-3 mb-4">
        {participants.map(p => {
          const sentStyle = SENTIMENT_STYLES[p.sentimentTone] || SENTIMENT_STYLES.neutral;
          const barColor = p.side === 'client' ? '#7C3AED' : p.side === 'external' ? '#64748B' : '#2AB182';

          return (
            <div key={p.name} className="flex items-center gap-3">
              <span 
                className="text-[12px] font-semibold truncate"
                style={{ color: 'var(--c-text-2)', width: '100px', flexShrink: 0 }}
              >
                {p.name}
              </span>
              <div 
                className="flex-1 rounded-full overflow-hidden"
                style={{ height: '8px', background: 'var(--c-surface-2)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${p.estimatedPercent}%`, background: barColor }}
                />
              </div>
              <span 
                className="text-[12px] font-bold text-right"
                style={{ color: 'var(--c-text)', width: '36px', flexShrink: 0 }}
              >
                {p.estimatedPercent}%
              </span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: sentStyle.bg, color: sentStyle.color, flexShrink: 0 }}
              >
                {p.sentimentTone}
              </span>
            </div>
          );
        })}
      </div>

      {/* Balance note */}
      {balanceNote && (
        <p 
          className="text-[12px] rounded-lg px-3 py-2 italic"
          style={{ color: balance.color, background: `${balance.color}0D`, border: `1px solid ${balance.color}25` }}
        >
          💡 {balanceNote}
        </p>
      )}
    </div>
  );
}
