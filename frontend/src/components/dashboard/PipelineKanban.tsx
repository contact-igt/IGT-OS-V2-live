interface PipelineLead {
  id: string;
  name: string;
  company: string;
  amount: number;
  stage: 'DISCOVERY' | 'PROPOSAL' | 'REVISION' | 'CLOSING' | 'WON';
  statusText: string;
  isHighValue?: boolean;
}

interface PipelineKanbanProps {
  leads: PipelineLead[];
  pipelineTotal: number;
}

export function PipelineKanban({ leads, pipelineTotal }: PipelineKanbanProps) {
  const columns: { title: string; stage: PipelineLead['stage'] }[] = [
    { title: 'DISCOVERY', stage: 'DISCOVERY' },
    { title: 'PROPOSAL', stage: 'PROPOSAL' },
    { title: 'REVISION', stage: 'REVISION' },
    { title: 'CLOSING', stage: 'CLOSING' },
    { title: 'WON THIS MONTH', stage: 'WON' },
  ];

  return (
    <div className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-[var(--c-border)]">
        <h3 className="font-syne font-bold text-[var(--c-text)] text-sm tracking-wider uppercase">
          PIPELINE KANBAN
        </h3>
      </div>
      
      <div className="flex overflow-x-auto p-4 gap-4" style={{ minHeight: '300px' }}>
        {columns.map((col) => {
          const colLeads = leads.filter(l => l.stage === col.stage);
          
          return (
            <div key={col.stage} className="flex-1 min-w-[220px] bg-[var(--c-surface-2)] rounded-lg p-3 flex flex-col">
              <div className="flex items-center justify-between mb-4 px-1">
                <h4 className="text-xs font-bold text-[var(--c-text-2)] uppercase tracking-wider">
                  {col.title}
                </h4>
                <span className="bg-[var(--c-surface-3)] text-[var(--c-text)] text-xs font-bold px-2 py-0.5 rounded-full">
                  {colLeads.length}
                </span>
              </div>
              
              <div className="flex-1 flex flex-col gap-3">
                {colLeads.map((lead) => (
                  <div key={lead.id} className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-md p-3 shadow-sm hover:border-[var(--c-primary)] transition-colors cursor-pointer group">
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-semibold text-[var(--c-text)] text-sm group-hover:text-[var(--c-primary)] transition-colors">
                        {lead.name}
                      </div>
                      {lead.isHighValue && (
                        <span className="text-[8px] font-bold bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded uppercase">
                          Hot
                        </span>
                      )}
                    </div>
                    
                    <div className="text-xs text-[var(--c-text-2)] mb-2">
                      {lead.company}
                    </div>
                    
                    <div className="font-bold text-[var(--c-text)] text-sm mb-2">
                      ₹{lead.amount.toLocaleString('en-IN')}
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs text-[var(--c-text-3)] font-medium">
                      {lead.stage === 'WON' ? (
                        <span className="text-emerald-500">✓ {lead.statusText}</span>
                      ) : (
                        lead.statusText
                      )}
                    </div>
                  </div>
                ))}
                
                {colLeads.length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-[var(--c-text-3)] text-xs font-medium border-2 border-dashed border-[var(--c-border)] rounded-md">
                    Empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="px-6 py-4 border-t border-[var(--c-border)] bg-[var(--c-surface-2)] flex justify-between items-center">
        <span className="text-sm font-semibold text-[var(--c-text-2)]">Pipeline total:</span>
        <span className="text-sm font-bold text-[var(--c-text)]">₹{pipelineTotal.toLocaleString('en-IN')}/month potential</span>
      </div>
    </div>
  );
}
