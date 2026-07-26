'use client';
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { GoogleEvent } from '@/lib/googleCalendar';
import { X } from 'lucide-react';

interface Props {
  event: GoogleEvent;
  onClose: () => void;
  onSaved: (meetingId: string) => void;
}

// Lightweight analyze flow scoped to a single calendar event — prefilled title/date/
// attendees, no Gmail import (that's for the unscoped "New Meeting Note" flow). On success
// the note is saved with this event's id so its card flips from "not analyzed" to a link
// straight into the results.
export default function MeetingAnalyzePanel({ event, onClose, onSaved }: Props) {
  const { state, saveMeetingNote } = useApp();
  const [transcript, setTranscript] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisPreference, setAnalysisPreference] = useState<'general' | 'sales' | 'project-management' | 'technical'>('general');
  const [models, setModels] = useState<{ name: string; displayName: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [modelsError, setModelsError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/gemini-models')
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
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

  const handleAudioUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/recordings/upload-audio', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audio transcription failed');
      setTranscript(data.transcript);
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
      const res = await fetch('/api/analyze-meeting', {
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
        className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
      >
        <div className="flex items-start justify-between p-5 border-b" style={{ borderColor: 'var(--c-border)' }}>
          <div>
            <h3 className="font-bold text-[17px]" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-syne-var)' }}>{event.summary}</h3>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--c-text-3)' }}>
              {new Date(event.start.dateTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {attendeeNames ? ` · ${attendeeNames}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ background: 'var(--c-surface-2)', color: 'var(--c-text-3)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="rounded-xl overflow-hidden mb-4" style={{ border: '1px solid var(--c-border)' }}>
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
              <span className="text-[13px] font-bold" style={{ color: 'var(--c-text-2)' }}>Transcript</span>
              <span className="ml-auto text-[11px]" style={{ color: 'var(--c-text-3)' }}>{transcript.length} chars</span>
            </div>
            <textarea
              className="w-full resize-none outline-none p-4 text-[13px] leading-relaxed"
              style={{ background: 'transparent', color: 'var(--c-text)', minHeight: '180px', fontFamily: 'var(--font-grotesk-var)' }}
              placeholder="Paste this meeting's transcript here..."
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 mb-4 text-[13px]" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}>
              ⚠ {error}
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap mb-4">
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
              🎙 Upload Audio
              <input type="file" accept="audio/*,video/*" className="hidden" onChange={handleAudioUpload} disabled={analyzing} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
