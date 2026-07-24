'use client';

import { useApp } from '@/contexts/AppContext';
import { useParams, useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import MeetingQualityBadge from '@/components/ai/MeetingQualityBadge';
import TalkTimeBar from '@/components/ai/TalkTimeBar';
import { ArrowLeft } from 'lucide-react';

type Tab = 'overview' | 'decisions' | 'tasks' | 'insights' | 'chat' | 'transcript';

export default function MeetingDetailPage() {
  const { id } = useParams();
  const { state, createTask } = useApp();
  const router = useRouter();

  const meeting = state.meetingNotes.find((m: any) => m.id === id);
  const [tab, setTab] = useState<Tab>('overview');

  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', content: string}[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [createdTitles, setCreatedTitles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  if (!meeting) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-xl font-bold">Meeting Not Found</h2>
        <button onClick={() => router.push('/meetings')} className="mt-4 text-primary">Go Back</button>
      </div>
    );
  }

  const { result } = meeting;
  const createdTasks = state.tasks.filter(t => (meeting.tasksCreated || []).includes(t.id));

  const handleChat = async () => {
    if (!chatMessage.trim() || isChatting) return;

    const msg = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: msg }]);
    setIsChatting(true);

    try {
      const res = await fetch('/api/meeting-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: msg,
          transcript: meeting.transcriptSnippet,
          previousMessages: chatHistory.map(h => ({ role: h.role === 'ai' ? 'assistant' : 'user', content: h.content }))
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setChatHistory(prev => [...prev, { role: 'ai', content: data.answer }]);
    } catch (e: any) {
      setChatHistory(prev => [...prev, { role: 'ai', content: `Error: ${e.message}` }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleCreateTask = useCallback((item: any) => {
    createTask({
      title: item.title,
      description: item.description || '',
      clientId: meeting.clientId || state.clients[0]?.id,
      category: 'operations' as any,
      assignedTo: [state.currentUserId],
      createdBy: state.currentUserId,
      priority: (item.priority || 'medium') as any,
      status: 'todo',
      deadline: item.deadline || null,
      estimatedHours: 2,
      tags: ['meeting-generated', `meeting-${meeting.id}`],
    } as any);
    setCreatedTitles(prev => new Set(prev).add(item.title));
  }, [createTask, meeting, state.clients, state.currentUserId]);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'decisions', label: `Decisions (${result.decisions?.length || 0})` },
    { id: 'tasks', label: `Tasks (${result.actionItems?.length || 0})` },
    { id: 'insights', label: 'Insights' },
    { id: 'chat', label: 'AI Chat' },
    { id: 'transcript', label: 'Transcript' },
  ];

  return (
    <div className="max-w-4xl mx-auto h-full overflow-y-auto p-4">
      <button onClick={() => router.push('/meetings')} className="flex items-center gap-1.5 text-[12px] font-bold mb-4 hover:opacity-70 transition-opacity" style={{ color: 'var(--c-text-3)' }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Meetings
      </button>

      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-syne-var)' }}>
        {result.meetingMeta?.title || meeting.title || 'Meeting Notes'}
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--c-text-3)' }}>
        {result.meetingMeta?.clientName && <span>{result.meetingMeta.clientName} · </span>}
        {result.meetingMeta?.date && new Date(result.meetingMeta.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        {result.meetingMeta?.durationMinutes && ` · ${result.meetingMeta.durationMinutes}m`}
      </p>

      <div className="flex gap-1 p-1 rounded-xl mb-6 flex-wrap" style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-3 py-2 rounded-lg text-[12px] font-bold transition-all"
            style={{
              background: tab === t.id ? 'var(--c-surface)' : 'transparent',
              color: tab === t.id ? 'var(--c-text)' : 'var(--c-text-3)',
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-5">
          <MeetingQualityBadge quality={result.meetingQuality} />

          <div className="rounded-xl p-5" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
            <h3 className="text-[13px] font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--c-text-2)' }}>Talk Time Breakdown</h3>
            <TalkTimeBar
              participants={result.talkTime.participants}
              clientTalkPercent={result.talkTime.clientTalkPercent}
              invictusTalkPercent={result.talkTime.invictusTalkPercent}
              conversationBalance={result.talkTime.conversationBalance}
              balanceNote={result.talkTime.balanceNote}
            />
          </div>

          {result.summary && (
            <div className="rounded-xl p-5" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <h3 className="text-[14px] font-bold mb-2" style={{ color: 'var(--c-text)' }}>Summary</h3>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--c-text-2)' }}>{result.summary}</p>
            </div>
          )}

          {result.keyPoints && result.keyPoints.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <h3 className="text-[14px] font-bold mb-3" style={{ color: 'var(--c-text)' }}>Key Takeaways</h3>
              <ul className="space-y-2">
                {result.keyPoints.map((kp: any, i: any) => (
                  <li key={i} className="text-[13px] flex items-start gap-2" style={{ color: 'var(--c-text-2)' }}>
                    <span style={{ color: '#7C3AED' }}>•</span> {kp}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === 'decisions' && (
        <div className="space-y-3">
          {(!result.decisions || result.decisions.length === 0) ? (
            <div className="text-center py-12 rounded-xl" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <p style={{ color: 'var(--c-text-3)' }}>No decisions extracted from this transcript.</p>
            </div>
          ) : result.decisions.map((d: any, i: any) => (
            <div key={i} className="rounded-xl p-4" style={{ background: 'var(--c-surface)', border: `1px solid ${d.isBinding ? 'rgba(42,177,130,0.3)' : 'var(--c-border)'}` }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-[14px] font-semibold" style={{ color: 'var(--c-text)' }}>{d.decision}</p>
                <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full" style={d.isBinding ? { background: 'rgba(42,177,130,0.1)', color: '#2AB182' } : { background: 'var(--c-surface-2)', color: 'var(--c-text-3)' }}>
                  {d.isBinding ? '✓ Binding' : 'Non-binding'}
                </span>
              </div>
              {d.decidedBy && <p className="text-[12px] mb-2" style={{ color: 'var(--c-text-3)' }}>Decided by: {d.decidedBy}</p>}
              {d.sourceQuote && (
                <blockquote className="text-[11px] italic px-3 py-2 rounded-lg mt-2" style={{ color: 'var(--c-text-3)', background: 'var(--c-surface-2)', borderLeft: '3px solid var(--c-border)' }}>
                  "{d.sourceQuote}"
                </blockquote>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'tasks' && (
        <div className="space-y-5">
          {createdTasks.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--c-text-2)' }}>Created Tasks ({createdTasks.length})</h3>
              <div className="space-y-2">
                {createdTasks.map(t => (
                  <div key={t.id} className="rounded-lg p-3 flex items-center justify-between" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                    <span className="text-[13px]" style={{ color: 'var(--c-text)' }}>{t.title}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: 'var(--c-surface-2)', color: 'var(--c-text-3)' }}>{t.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-[13px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--c-text-2)' }}>Action Items ({result.actionItems?.length || 0})</h3>
            {(!result.actionItems || result.actionItems.length === 0) ? (
              <div className="text-center py-12 rounded-xl" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                <p style={{ color: 'var(--c-text-3)' }}>No action items detected in this meeting.</p>
              </div>
            ) : result.actionItems.map((item: any, i: any) => {
              const alreadyCreated = createdTitles.has(item.title) || createdTasks.some(t => t.title === item.title);
              return (
                <div key={i} className="rounded-lg p-3 flex items-center justify-between gap-3 mb-2" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: 'var(--c-text)' }}>{item.title}</p>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>{item.priority}</span>
                  </div>
                  <button
                    onClick={() => handleCreateTask(item)}
                    disabled={alreadyCreated}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'rgba(42,177,130,0.1)', color: '#2AB182' }}
                  >
                    {alreadyCreated ? '✓ Created' : '+ Create Task'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'insights' && (
        <div className="space-y-5">
          {result.projectInsights && (
            <div className="rounded-xl p-5" style={{ background: 'var(--c-surface)', border: '1px solid rgba(42,177,130,0.3)' }}>
              <h3 className="text-[14px] font-bold mb-2" style={{ color: '#2AB182' }}>Project Management Insights</h3>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--c-text-2)' }}>{result.projectInsights}</p>
            </div>
          )}
          {result.salesInsights && (
            <div className="rounded-xl p-5" style={{ background: 'var(--c-surface)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <h3 className="text-[14px] font-bold mb-2" style={{ color: '#F59E0B' }}>Sales Insights</h3>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--c-text-2)' }}>{result.salesInsights}</p>
            </div>
          )}
          {result.aiInsights && (
            <div className="rounded-xl p-5" style={{ background: 'var(--c-surface)', border: '1px solid rgba(124,58,237,0.3)' }}>
              <h3 className="text-[14px] font-bold mb-2" style={{ color: '#7C3AED' }}>Technical / AI Insights</h3>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--c-text-2)' }}>{result.aiInsights}</p>
            </div>
          )}
          {result.roleInsights && (
            <div className="rounded-xl p-5" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <h3 className="text-[14px] font-bold mb-2" style={{ color: 'var(--c-text)' }}>General Role Insights</h3>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--c-text-2)' }}>{result.roleInsights}</p>
            </div>
          )}
          {!result.projectInsights && !result.salesInsights && !result.aiInsights && !result.roleInsights && (
            <div className="text-center py-12 rounded-xl" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <p style={{ color: 'var(--c-text-3)' }}>No deep insights generated for this lens.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'chat' && (
        <div className="flex flex-col rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)', height: '500px' }}>
          <div className="p-4 border-b" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
            <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--c-text)' }}>
              <span className="text-xl">🤖</span> Chat with Meeting
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--c-text-3)' }}>Ask questions about this specific meeting.</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
            {chatHistory.length === 0 ? (
              <p className="text-sm text-center mt-10" style={{ color: 'var(--c-text-3)' }}>Say "What were the key objections?" or "Did we promise a deadline?"</p>
            ) : (
              chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-xl max-w-[85%] text-sm ${msg.role === 'user' ? 'bg-primary text-white rounded-br-none' : 'rounded-bl-none'}`} style={msg.role === 'ai' ? { background: 'var(--c-surface-2)', color: 'var(--c-text-2)' } : {}}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isChatting && (
              <div className="flex justify-start">
                <div className="p-3 rounded-xl text-xs animate-pulse rounded-bl-none" style={{ background: 'var(--c-surface-2)', color: 'var(--c-text-3)' }}>Thinking...</div>
              </div>
            )}
          </div>

          <div className="p-3 border-t" style={{ borderColor: 'var(--c-border)' }}>
            <div className="relative">
              <input
                type="text"
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleChat()}
                placeholder="Ask a question..."
                className="w-full rounded-xl py-3 pl-4 pr-12 text-sm outline-none"
                style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
              />
              <button onClick={handleChat} disabled={isChatting || !chatMessage.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 text-primary p-2 disabled:opacity-50 hover:opacity-80">
                <span className="material-symbols-outlined text-xl">send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'transcript' && (
        <div className="rounded-xl p-5" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
          <pre className="text-[13px] whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--c-text-2)', fontFamily: 'inherit' }}>
            {meeting.transcriptSnippet || 'No transcript available.'}
          </pre>
        </div>
      )}
    </div>
  );
}
