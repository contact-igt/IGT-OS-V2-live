import Link from 'next/link';

interface CampaignCardProps {
  id: string;
  clientCode: string;
  clientName: string;
  channelName: string;
  status: 'LIVE' | 'PROOF WINDOW' | 'NEEDS ATTENTION' | 'PAUSED';
  weekSpend: number;
  budget: number;
  weekLeads: number;
  cpl: number;
  targetCpl?: number;
  lastOptimized: string;
  trend?: {
    value: number; // e.g. 8 for +8%, -5 for -5%
    label: string; // e.g. "vs last week"
  };
  proofDeadline?: string;
  reminderText?: string;
  onLogNumbers?: () => void;
  onOptimize?: () => void;
  onOpen?: () => void;
}

export function CampaignCard(props: CampaignCardProps) {
  const isNeedsAttention = props.status === 'NEEDS ATTENTION';
  const isProofWindow = props.status === 'PROOF WINDOW';
  
  const statusColor = 
    props.status === 'LIVE' ? 'text-emerald-500' :
    props.status === 'PROOF WINDOW' ? 'text-red-500' :
    props.status === 'NEEDS ATTENTION' ? 'text-amber-500' :
    'text-slate-500';

  const cardBorder = 
    isNeedsAttention ? 'border-amber-500' :
    isProofWindow ? 'border-red-500' :
    'border-[var(--c-border)]';

  return (
    <div className={`w-full bg-[var(--c-surface)] border ${cardBorder} rounded-xl p-5 mb-4`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-[var(--c-text)]">
          <span className="text-[var(--c-text-3)] font-mono text-xs mr-2">[{props.clientCode}]</span>
          {props.clientName} — {props.channelName}
        </h4>
        <div className={`flex items-center gap-1.5 text-xs font-bold ${statusColor}`}>
          <span className="text-[10px]">●</span>
          {props.status}
        </div>
      </div>

      {!isNeedsAttention ? (
        <div className="space-y-2 text-sm text-[var(--c-text-2)]">
          <div className="flex items-center justify-between">
            <span>Week spend: ₹{props.weekSpend.toLocaleString()} / ₹{props.budget.toLocaleString()} budget</span>
            {props.weekSpend <= props.budget ? (
              <span className="text-emerald-500 font-bold">✅ Pacing OK</span>
            ) : (
              <span className="text-red-500 font-bold">⚠ Over pacing</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span>Week leads: {props.weekLeads}</span>
            <span className="text-[var(--c-border)]">|</span>
            <span>CPL ₹{props.cpl.toLocaleString()}</span>
            
            {props.targetCpl && props.cpl > props.targetCpl && (
              <>
                <span className="text-[var(--c-border)]">|</span>
                <span className="text-amber-500 font-bold">Target: ₹{props.targetCpl} ⚠</span>
              </>
            )}
            
            {props.trend && (
              <>
                <span className="text-[var(--c-border)]">|</span>
                <span className={props.trend.value > 0 ? 'text-red-500' : 'text-emerald-500'}>
                  {props.trend.value > 0 ? '▲' : '▼'} {props.trend.value > 0 ? '+' : ''}{props.trend.value}%
                </span>
                <span className="text-xs">{props.trend.label}</span>
              </>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--c-border)]">
            {isProofWindow && props.proofDeadline ? (
              <span className="text-red-500 font-bold">
                ⏰ Proof deadline: {props.proofDeadline}
              </span>
            ) : (
              <span>Last optimized: {props.lastOptimized}</span>
            )}
            
            <button 
              onClick={isProofWindow ? props.onOptimize : props.onLogNumbers}
              className="text-[var(--c-primary)] font-bold text-xs hover:underline"
            >
              {isProofWindow ? '[Optimize Now →]' : '[Log Numbers →]'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-[var(--c-text-2)]">
          <div>Last optimized: {props.lastOptimized}</div>
          <div className="text-amber-500 font-medium">Reminder: {props.reminderText || 'Campaign needs attention'}</div>
          <div className="flex justify-end mt-2">
            <button 
              onClick={props.onOpen}
              className="text-amber-600 font-bold text-xs hover:underline"
            >
              [Open →]
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
