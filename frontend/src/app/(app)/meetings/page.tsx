'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { fetchGoogleCalendarEvents, GoogleEvent } from '@/lib/googleCalendar';
import MeetingAnalyzePanel from '@/components/ai/MeetingAnalyzePanel';
import MeetingNotesTab from '@/components/ai/MeetingNotesTab';
import { ArrowLeft, Check, Sparkles, Calendar as CalendarIcon } from 'lucide-react';

interface MeetingCard {
  id: string;
  title: string;
  start: string;
  attendees?: { email: string }[];
  analyzed: boolean;
  noteId?: string;
  isCalendarEvent: boolean;
  clientName?: string | null;
}

function MeetingsPageInner() {
  const { state } = useApp();
  const { user } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState<GoogleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [analyzePanelEvent, setAnalyzePanelEvent] = useState<GoogleEvent | null>(null);
  const [showNewNote, setShowNewNote] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const now = new Date();
      const start = new Date(now); start.setDate(start.getDate() - 90);
      const end = new Date(now); end.setDate(end.getDate() + 14);
      const { events: fetched, connected: isConnected } = await fetchGoogleCalendarEvents(!!user, start.toISOString(), end.toISOString());
      setEvents(fetched);
      setConnected(isConnected);
      setLoading(false);
    }
    load();

    async function loadGoogleStatus() {
      if (!user) return;
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiBaseUrl}/api/google/status`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          setGoogleEmail(data.email || null);
        }
      } catch (err) {
        console.error('Failed to load Google connection status:', err);
      }
    }
    loadGoogleStatus();
  }, [user]);

  const cards: MeetingCard[] = useMemo(() => {
    const eventCards: MeetingCard[] = events.map(ev => {
      const note = state.meetingNotes.find((n: any) => n.googleEventId === ev.id);
      return {
        id: ev.id,
        title: ev.summary,
        start: ev.start.dateTime,
        attendees: ev.attendees,
        analyzed: !!note,
        noteId: note?.id,
        isCalendarEvent: true,
        clientName: note ? (state.clients.find(c => c.id === note.clientId)?.name || null) : null,
      };
    });

    const manualNoteCards: MeetingCard[] = state.meetingNotes
      .filter((n: any) => !n.googleEventId)
      .map((n: any) => ({
        id: n.id,
        title: n.result?.meetingMeta?.title || 'Meeting Notes',
        start: n.processedAt,
        analyzed: true,
        noteId: n.id,
        isCalendarEvent: false,
        clientName: state.clients.find(c => c.id === n.clientId)?.name || null,
      }));

    return [...eventCards, ...manualNoteCards].sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
  }, [events, state.meetingNotes, state.clients]);

  // Group cards by date for clear segregation
  const groupedCards = useMemo(() => {
    const groups: { [dateStr: string]: { dateStr: string; label: string; isToday: boolean; isYesterday: boolean; cards: MeetingCard[] } } = {};

    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    for (const card of cards) {
      const cardDate = new Date(card.start);
      if (isNaN(cardDate.getTime())) continue;

      const dateStr = cardDate.toDateString();
      const isToday = dateStr === todayStr;
      const isYesterday = dateStr === yesterdayStr;

      let label = '';
      if (isToday) {
        label = `Today — ${cardDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}`;
      } else if (isYesterday) {
        label = `Yesterday — ${cardDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}`;
      } else {
        label = cardDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      }

      if (!groups[dateStr]) {
        groups[dateStr] = { dateStr, label, isToday, isYesterday, cards: [] };
      }
      groups[dateStr].cards.push(card);
    }

    // Return array sorted by newest date first
    return Object.values(groups).sort((a, b) => new Date(b.cards[0].start).getTime() - new Date(a.cards[0].start).getTime());
  }, [cards]);

  const handleCardClick = useCallback((card: MeetingCard) => {
    if (card.analyzed && card.noteId) {
      router.push(`/meetings/${card.noteId}`);
      return;
    }
    const event = events.find(e => e.id === card.id);
    if (event) setAnalyzePanelEvent(event);
  }, [events, router]);

  if (showNewNote) {
    return (
      <div className="h-full overflow-y-auto">
        <button
          onClick={() => setShowNewNote(false)}
          className="flex items-center gap-1.5 text-[12px] font-bold mb-4 hover:opacity-70 transition-opacity"
          style={{ color: 'var(--c-text-3)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Meetings
        </button>
        <MeetingNotesTab />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-bold" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-syne-var)' }}>Meeting Summaries</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--c-text-3)' }}>
            {connected
              ? (googleEmail ? `Synced from ${googleEmail}` : 'Synced from your Google Calendar')
              : 'Connect Google Calendar to see your synced meetings'}
          </p>
        </div>
        <button
          onClick={() => setShowNewNote(true)}
          className="btn-primary flex items-center gap-1.5"
        >
          <Sparkles className="w-4 h-4" /> New Meeting Note
        </button>
      </div>

      {!connected && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center justify-between">
          <p className="text-[13px]" style={{ color: 'var(--c-text-2)' }}>
            Your calendar isn't connected yet, so only manually-added meeting notes show below.
          </p>
          <button onClick={() => router.push('/calendar')} className="text-[12px] font-bold text-primary hover:underline flex-shrink-0 ml-4">
            Connect Google →
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-[13px] text-center py-16" style={{ color: 'var(--c-text-3)' }}>Loading meetings...</div>
      ) : cards.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center" style={{ borderColor: 'var(--c-border)' }}>
          <p className="text-[14px] font-bold mb-1" style={{ color: 'var(--c-text)' }}>No meetings yet</p>
          <p className="text-[13px]" style={{ color: 'var(--c-text-3)' }}>Connect Google Calendar, or click "New Meeting Note" to paste a transcript directly.</p>
        </div>
      ) : (
        /* Segregated Meeting Cards by Date */
        <div className="space-y-8">
          {groupedCards.map(group => (
            <div key={group.dateStr} className="space-y-3">
              {/* Date Group Header */}
              <div className="flex items-center gap-3 border-b pb-2" style={{ borderColor: 'var(--c-border)' }}>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  <h2 className="text-[14px] font-bold" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-syne-var)' }}>
                    {group.label}
                  </h2>
                </div>
                {group.isToday && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Today" />
                )}
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--c-surface-2)', color: 'var(--c-text-3)' }}
                >
                  {group.cards.length} {group.cards.length === 1 ? 'meeting' : 'meetings'}
                </span>
              </div>

              {/* Cards Grid for this Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.cards.map(card => (
                  <button
                    key={card.id}
                    onClick={() => handleCardClick(card)}
                    className="text-left card-surface2 p-4 rounded-xl border border-border hover:border-primary/50 transition-all hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-[14px] leading-snug" style={{ color: 'var(--c-text)' }}>{card.title}</h3>
                      {card.analyzed ? (
                        <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(42,177,130,0.1)', color: '#2AB182' }}>
                          <Check className="w-3 h-3" /> Analyzed
                        </span>
                      ) : (
                        <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--c-surface-3)', color: 'var(--c-text-3)' }}>
                          Not analyzed
                        </span>
                      )}
                    </div>

                    <p className="text-[12px] mb-3" style={{ color: 'var(--c-text-3)' }}>
                      {new Date(card.start).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>

                    {card.clientName && (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-primary mb-2">{card.clientName}</span>
                    )}

                    {card.attendees && card.attendees.length > 0 && (
                      <div className="flex -space-x-1.5 mt-2">
                        {card.attendees.slice(0, 4).map((a, i) => (
                          <div
                            key={i}
                            title={a.email}
                            className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-bold"
                            style={{ borderColor: 'var(--c-surface)', background: 'var(--c-surface-3)', color: 'var(--c-text-2)' }}
                          >
                            {a.email.slice(0, 2).toUpperCase()}
                          </div>
                        ))}
                        {card.attendees.length > 4 && (
                          <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-bold" style={{ borderColor: 'var(--c-surface)', background: 'var(--c-surface-3)', color: 'var(--c-text-2)' }}>
                            +{card.attendees.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {analyzePanelEvent && (
        <MeetingAnalyzePanel
          event={analyzePanelEvent}
          onClose={() => setAnalyzePanelEvent(null)}
          onSaved={(meetingId) => {
            setAnalyzePanelEvent(null);
            router.push(`/meetings/${meetingId}`);
          }}
        />
      )}
    </div>
  );
}

export default function MeetingsPage() {
  return (
    <Suspense fallback={null}>
      <MeetingsPageInner />
    </Suspense>
  );
}
