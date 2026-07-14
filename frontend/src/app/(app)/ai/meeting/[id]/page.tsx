'use client';

import { useApp } from '@/contexts/AppContext';
import { useParams, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import MeetingQualityBadge from '@/components/ai/MeetingQualityBadge';
import TalkTimeBar from '@/components/ai/TalkTimeBar';

export default function MeetingDetailPage() {
  const { id } = useParams();
  const { state } = useApp();
  const router = useRouter();
  
  const meeting = state.meetingNotes.find(m => m.id === id);
  
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', content: string}[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  if (!meeting) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-xl font-bold">Meeting Not Found</h2>
        <button onClick={() => router.push('/ai?tab=meeting')} className="mt-4 text-primary">Go Back</button>
      </div>
    );
  }

  const { result } = meeting;

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
          transcript: meeting.transcriptSnippet, // We store snippet or full transcript
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

  return (
    <div className="max-w-6xl mx-auto flex gap-6 h-full p-4 overflow-hidden">
      {/* LEFT: Meeting details */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        <div>
          <button onClick={() => router.push('/ai?tab=meeting')} className="text-[12px] text-gray-500 font-bold mb-4">← Back to Meetings</button>
          <h1 className="text-3xl font-bold text-white mb-2">{result.meetingMeta?.title || 'Meeting Notes'}</h1>
          <p className="text-gray-400 text-sm">
            {result.meetingMeta?.clientName} · {result.meetingMeta?.date} · {result.meetingMeta?.durationMinutes}m
          </p>
        </div>

        <MeetingQualityBadge quality={result.meetingQuality} />

        <div className="rounded-xl p-5 bg-[var(--c-surface)] border border-[var(--c-border)]">
          <h3 className="text-[13px] font-bold uppercase tracking-wider mb-4 text-gray-400">Talk Time Breakdown</h3>
          <TalkTimeBar
            participants={result.talkTime.participants}
            clientTalkPercent={result.talkTime.clientTalkPercent}
            invictusTalkPercent={result.talkTime.invictusTalkPercent}
            conversationBalance={result.talkTime.conversationBalance}
            balanceNote={result.talkTime.balanceNote}
          />
        </div>

        {result.summary && (
          <div className="rounded-xl p-5 bg-[var(--c-surface)] border border-[var(--c-border)]">
            <h3 className="text-lg font-bold mb-2">Summary</h3>
            <p className="text-sm text-gray-400">{result.summary}</p>
          </div>
        )}

        <div className="rounded-xl p-5 bg-[var(--c-surface)] border border-[var(--c-border)]">
           <h3 className="text-lg font-bold mb-4">Action Items Created</h3>
           {meeting.tasksCreated?.length > 0 ? (
             <ul className="space-y-2">
               {meeting.tasksCreated.map((tId: string) => {
                 const task = state.tasks.find(t => t.id === tId);
                 return task ? (
                   <li key={tId} className="text-sm flex gap-3 p-3 rounded-lg bg-[var(--c-surface-2)]">
                     <span className="text-primary font-bold">{(task as any).displayCode || task.id.substring(0,6)}</span>
                     <span>{task.title}</span>
                   </li>
                 ) : null;
               })}
             </ul>
           ) : (
             <p className="text-sm text-gray-500">No tasks created.</p>
           )}
        </div>
        
        <div className="rounded-xl p-5 bg-[var(--c-surface)] border border-[var(--c-border)]">
          <h3 className="text-lg font-bold mb-4">Transcript Snippet</h3>
          <pre className="text-xs text-gray-500 whitespace-pre-wrap">{meeting.transcriptSnippet}</pre>
        </div>
      </div>

      {/* RIGHT: Chat */}
      <div className="w-[400px] flex flex-col rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] overflow-hidden">
        <div className="p-4 border-b border-[var(--c-border)] bg-[var(--c-surface-2)]">
          <h3 className="font-bold flex items-center gap-2">
            <span className="text-xl">🤖</span> Chat with Meeting
          </h3>
          <p className="text-xs text-gray-400 mt-1">Ask questions about this specific meeting.</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {chatHistory.length === 0 ? (
            <p className="text-sm text-gray-500 text-center mt-10">Say "What were the key objections?" or "Did we promise a deadline?"</p>
          ) : (
            chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-xl max-w-[85%] text-sm ${msg.role === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-[var(--c-surface-2)] text-gray-300 rounded-bl-none'}`}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {isChatting && (
             <div className="flex justify-start">
               <div className="p-3 rounded-xl bg-[var(--c-surface-2)] text-gray-400 rounded-bl-none text-xs animate-pulse">
                 Claude is thinking...
               </div>
             </div>
          )}
        </div>
        
        <div className="p-3 border-t border-[var(--c-border)] bg-[var(--c-surface)]">
          <div className="relative">
            <input 
              type="text" 
              value={chatMessage}
              onChange={e => setChatMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChat()}
              placeholder="Ask a question..."
              className="w-full bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-xl py-3 pl-4 pr-12 text-sm outline-none text-white focus:border-primary"
            />
            <button 
              onClick={handleChat}
              disabled={isChatting || !chatMessage.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-primary p-2 disabled:opacity-50 hover:opacity-80"
            >
              <span className="material-symbols-outlined text-xl">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
