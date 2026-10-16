'use client';
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleEvent } from '@/lib/googleCalendar';
import { X, Mail, Mic, ChevronDown, ChevronUp, CheckCircle, Sparkles } from 'lucide-react';
import { aiFetch } from '@/lib/aiFetch';

interface Props {
  event: GoogleEvent;
  onClose: () => void;
  onSaved: (meetingId: string) => void;
}

interface GmailRecap {
  id: string;
  subject: string;
  sender: string;
  date: string;
  preview: string;
  body: string;
}

// Computes relevance score between a GoogleEvent and a GmailRecap
function computeMatchScore(event: GoogleEvent, recap: GmailRecap): number {
  let score = 0;
  const eventTitle = (event.summary || '').toLowerCase().trim();
  const recapSubject = (recap.subject || '').toLowerCase().trim();
  const recapBody = (recap.preview || '').toLowerCase().trim() + ' ' + (recap.body || '').toLowerCase().slice(0, 300);

  // Extract clean words (3+ letters) from event title ignoring generic terms
  const stopWords = new Set(['call', 'meeting', 'discussion', 'with', 'and', 'the', 'for', 'igt', 'sync']);
  const titleWords = eventTitle
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stopWords.has(w));

  // 1. Direct title string match
  if (recapSubject.includes(eventTitle) || eventTitle.includes(recapSubject.replace(/^(notes|recap):?\s*/i, ''))) {
    score += 80;
  }

  // 2. Keyword overlap score
  for (const word of titleWords) {
    if (recapSubject.includes(word)) score += 25;
    else if (recapBody.includes(word)) score += 10;
  }

  // 3. Time proximity (event start/end vs recap email sent time)
  const eventMs = new Date(event.start.dateTime).getTime();
  const recapMs = new Date(recap.date).getTime();
  const gapMin = (recapMs - eventMs) / 60000;

  // Ideal recap arrives within 0 to 120 minutes after meeting starts
  if (gapMin >= -15 && gapMin <= 90) {
    score += 40;
  } else if (gapMin >= -30 && gapMin <= 240) {
    score += 20;
  } else if (gapMin >= -60 && gapMin <= 360) {
    score += 10;
  } else {
    score -= 30; // Penalize recaps sent far away in time
  }

  return score;
}

export default function MeetingAnalyzePanel({ event, onClose, onSaved }: Props) {
  const { state, saveMeetingNote } = useApp();
  const { user } = useAuth();

  const [transcript, setTranscript] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisPreference, setAnalysisPreference] = useState<'general' | 'sales' | 'project-management' | 'technical'>('general');
  const [models, setModels] = useState<{ name: string; displayName: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [modelsError, setModelsError] = useState<string | null>(null);

  const [recaps, setRecaps] = useState<GmailRecap[]>([]);
  const [loadingRecaps, setLoadingRecaps] = useState(true);
  const [matchedRecap, setMatchedRecap] = useState<GmailRecap | null>(null);
  const [showGmailPicker, setShowGmailPicker] = useState(false);
  const [autoSynced, setAutoSynced] = useState(false);

  // Fetch Gemini Models
  useEffect(() => {
    aiFetch('/api/gemini-models')
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Request failed");
        return data;
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setModels(data);
          setSelectedModel(data[0].name);
        } else {
          setModelsError('Gemini returned an empty model list.');
        }
      })
      .catch(err => setModelsError(err.message || 'Failed to load models.'));
  }, []);

  // Fetch & Auto-Match Gmail Recaps
  useEffect(() => {
    if (!user) { setLoadingRecaps(false); return; }
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${baseUrl}/api/google/gmail/meeting-recaps`, { credentials: 'include', cache: 'no-store' })
      .then(r => r.status === 404 ? [] : r.json())
      .then((data: any) => {
        if (!Array.isArray(data) || data.length === 0) {
          setLoadingRecaps(false);
          return;
        }

        // Rank recaps by score against this specific event
        const scored = data
          .map((r: GmailRecap) => ({ recap: r, score: computeMatchScore(event, r) }))
          .sort((a, b) => b.score - a.score);

        setRecaps(data);

        // If top scored recap has high confidence (> 45), auto-populate transcript!
        const topMatch = scored[0];
        if (topMatch && topMatch.score >= 35) {
          setMatchedRecap(topMatch.recap);
          setTranscript(topMatch.recap.body);
          setAutoSynced(true);
        }

        setLoadingRecaps(false);
      })
      .catch(() => setLoadingRecaps(false));
  }, [user, event]);

  const handleAudioUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await aiFetch('/api/recordings/upload-audio', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audio transcription failed');
      setTranscript(data.transcript);
      setAutoSynced(false);
      setMatchedRecap(null);
    } catch (err: any) {
      setError(err.message || 'Failed to upload audio.');
    } finally {
      setAnalyzing(false);
      e.target.value = '';
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (transcript.trim().length < 100) {
      setError('Transcript is too short. Please paste at least a few paragraphs.');
      return;
    }
    setError(null);
    setAnalyzing(true);
    try {
      const res = await aiFetch('/api/analyze-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          analysisPreference,
          model: selectedModel,
          context: {
            clients: state.clients.map(c => c.name),
            team: state.teamMembers.map(m => m.name),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');

      const meetingId = await saveMeetingNote({
        title: event.summary,
        googleEventId: event.id,
        transcriptSnippet: transcript,
        result: data,
        tasksCreated: [],
      });

      if (meetingId) {
        onSaved(meetingId);
      } else {
        setError('Analysis succeeded but saving failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }, [transcript, analysisPreference, selectedModel, state.clients, state.teamMembers, event, saveMeetingNote, onSaved]);

  const attendeeNames = (event.attendees || []).map(a => a.email.split('@')[0]).join(', ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b" style={{ borderColor: 'var(--c-border)' }}>
          <div>
            <h3 className="font-bold text-[17px]" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-syne-var)' }}>{event.summary}</h3>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--c-text-3)' }}>
              {new Date(event.start.dateTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {attendeeNames ? ` · ${attendeeNames}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-surface-2" style={{ background: 'var(--c-surface-2)', color: 'var(--c-text-3)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Auto-Sync Status or Manual Recap Selector */}
          <div
            className="rounded-xl p-4 transition-all"
            style={{
              background: autoSynced ? 'rgba(42,177,130,0.08)' : 'var(--c-surface-2)',
              border: autoSynced ? '1px solid rgba(42,177,130,0.3)' : '1px solid var(--c-border)'
            }}
          >
            {loadingRecaps ? (
              <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--c-text-3)' }}>
                <div className="w-3.5 h-3.5 rounded-full border border-t-transparent animate-spin" style={{ borderColor: 'var(--c-border)', borderTopColor: 'var(--c-primary)' }} />
                Matching recap email to <strong style={{ color: 'var(--c-text)' }}>{event.summary}</strong>...
              </div>
            ) : autoSynced && matchedRecap ? (
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[13px] font-bold" style={{ color: '#2AB182' }}>
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Auto-synced transcript for "{event.summary}"</span>
                  </div>
                  <button
                    onClick={() => setShowGmailPicker(v => !v)}
                    className="text-[11px] font-bold hover:underline"
                    style={{ color: 'var(--c-text-3)' }}
                  >
                    {showGmailPicker ? 'Close list ▲' : 'Change recap email ▼'}
                  </button>
                </div>
                <p className="text-[11px] mt-1 line-clamp-1" style={{ color: 'var(--c-text-3)' }}>
                  From: {matchedRecap.subject} ({matchedRecap.date})
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] font-bold" style={{ color: 'var(--c-text-2)' }}>
                  <Mail className="w-4 h-4" style={{ color: 'var(--c-primary)' }} />
                  <span>Select matching recap email ({recaps.length} available)</span>
                </div>
                <button
                  onClick={() => setShowGmailPicker(v => !v)}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  {showGmailPicker ? 'Hide ▲' : 'Choose email ▼'}
                </button>
              </div>
            )}

            {/* Collapsible Gmail Recaps Picker */}
            {showGmailPicker && (
              <div className="mt-3 pt-3 border-t space-y-2 max-h-56 overflow-y-auto" style={{ borderColor: 'var(--c-border)' }}>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-3)' }}>
                  Recap emails found in Gmail:
                </p>
                {recaps.map(r => {
                  const score = computeMatchScore(event, r);
                  const isBestMatch = matchedRecap?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        setMatchedRecap(r);
                        setTranscript(r.body);
                        setAutoSynced(true);
                        setShowGmailPicker(false);
                        setError(null);
                      }}
                      className="w-full text-left rounded-xl p-3 transition-all hover:-translate-y-0.5 flex items-start justify-between gap-3"
                      style={{
                        background: isBestMatch ? 'rgba(42,177,130,0.12)' : 'var(--c-surface)',
                        border: isBestMatch ? '1px solid #2AB182' : '1px solid var(--c-border)'
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[12px] font-bold truncate" style={{ color: 'var(--c-text)' }}>
                            {r.subject}
                          </span>
                          {score >= 35 && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 flex-shrink-0">
                              ★ MATCH
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] line-clamp-1" style={{ color: 'var(--c-text-3)' }}>
                          {r.sender.toLowerCase().includes('fathom') ? '🎙 Fathom' : '🤖 Gemini'} · {r.preview.slice(0, 70)}...
                        </p>
                      </div>
                      <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--c-text-3)' }}>{r.date.split(' ')[4] || r.date}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Transcript Textarea */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
              <span className="text-[13px] font-bold" style={{ color: 'var(--c-text-2)' }}>Transcript</span>
              {autoSynced && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(42,177,130,0.15)', color: '#2AB182' }}>
                  <Sparkles className="w-3 h-3" /> Auto-filled
                </span>
              )}
              <span className="ml-auto text-[11px]" style={{ color: 'var(--c-text-3)' }}>{transcript.length} chars</span>
            </div>
            <textarea
              className="w-full resize-none outline-none p-4 text-[13px] leading-relaxed"
              style={{ background: 'transparent', color: 'var(--c-text)', minHeight: '180px', fontFamily: 'var(--font-grotesk-var)' }}
              placeholder="Paste this meeting's transcript here, or click above to auto-sync from Gmail..."
              value={transcript}
              onChange={e => {
                setTranscript(e.target.value);
                setAutoSynced(false);
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl px-4 py-3 text-[13px]" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}>
              ⚠ {error}
            </div>
          )}

          {/* Lens & Model controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[13px] font-bold" style={{ color: 'var(--c-text-2)' }}>Lens:</span>
            <select
              value={analysisPreference}
              onChange={e => setAnalysisPreference(e.target.value as any)}
              className="text-[13px] rounded-lg px-3 py-1.5 outline-none font-medium"
              style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
            >
              <option value="general">General</option>
              <option value="sales">Sales</option>
              <option value="project-management">Project Management</option>
              <option value="technical">Technical</option>
            </select>

            <span className="text-[13px] font-bold ml-2" style={{ color: 'var(--c-text-2)' }}>Model:</span>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              disabled={models.length === 0}
              className="text-[13px] rounded-lg px-3 py-1.5 outline-none font-medium disabled:opacity-50"
              style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
            >
              {models.length === 0 ? <option>No models available</option> : models.map(m => <option key={m.name} value={m.name}>{m.displayName}</option>)}
            </select>
            {modelsError && (
              <span className="text-[12px] font-medium text-red-500 w-full basis-full">{modelsError}</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleAnalyze}
              disabled={transcript.trim().length < 100 || analyzing}
              className="flex-1 py-3.5 rounded-lg font-bold text-[13px] text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover active:translate-y-[1px] bg-primary"
            >
              {analyzing ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Analyzing...
                </>
              ) : 'Analyze Meeting'}
            </button>
            <label
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-[13px] transition-all hover:-translate-y-0.5 cursor-pointer"
              style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-text-2)', flex: '0 0 auto' }}
            >
              <Mic className="w-4 h-4" /> Upload Audio
              <input type="file" accept="audio/*,video/*" className="hidden" onChange={handleAudioUpload} disabled={analyzing} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
