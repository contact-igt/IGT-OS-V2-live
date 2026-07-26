'use client';

import { useState, useCallback, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  MeetingAnalysisResult,
  ProposedTask,
  MeetingNote,
} from '@/lib/meetingTypes';
import TalkTimeBar from './TalkTimeBar';
import MeetingQualityBadge from './MeetingQualityBadge';
import TaskApprovalCard from './TaskApprovalCard';

// ─── Helpers ────────────────────────────────────────────────────────────────

function resolveClientId(clientName: string | null, clients: any[]): string {
  if (!clientName) return clients[0]?.id || '';
  const lower = clientName.toLowerCase();
  return clients.find(c => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase().split(' ')[0].toLowerCase()))?.id || clients[0]?.id || '';
}

// ─── Gmail Import Modal ─────────────────────────────────────────────────────

interface GmailRecap {
  id: string;
  subject: string;
  sender: string;
  date: string;
  preview: string;
  body: string;
}

function GmailImportModal({ onClose, onSelect }: { onClose: () => void; onSelect: (body: string) => void }) {
  const { user } = useAuth();
  const [recaps, setRecaps] = useState<GmailRecap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${baseUrl}/api/google/gmail/meeting-recaps`, { credentials: 'include', cache: 'no-store' })
      .then(r => r.status === 404 ? [] : r.json())
      .then(data => { setRecaps(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', maxHeight: '80vh' }}
      >
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--c-border)' }}>
          <div>
            <h3 className="font-bold text-[17px]" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-syne-var)' }}>Import from Gmail</h3>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--c-text-3)' }}>Fathom &amp; Gemini recaps from the last 14 days</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'var(--c-surface-2)', color: 'var(--c-text-3)' }}
          >✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12" style={{ color: 'var(--c-text-3)' }}>
              <div className="w-8 h-8 rounded-full border-2 border-t-primary animate-spin mb-3" style={{ borderColor: 'var(--c-border)', borderTopColor: 'var(--c-primary)' }} />
              <p className="text-[13px] font-medium">Scanning Gmail...</p>
            </div>
          ) : recaps.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[14px]" style={{ color: 'var(--c-text-3)' }}>No Fathom or Gemini recaps found in the last 14 days.</p>
              <p className="text-[12px] mt-2" style={{ color: 'var(--c-text-3)' }}>
                Make sure your Google account is connected — head to Calendar → Connect Google.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recaps.map(r => (
                <button
                  key={r.id}
                  onClick={() => { onSelect(r.body); onClose(); }}
                  className="w-full text-left rounded-xl p-4 transition-all hover:-translate-y-0.5"
                  style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border)' }}
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className="text-[13px] font-bold line-clamp-2" style={{ color: 'var(--c-text)' }}>{r.subject}</p>
                    <span className="text-[10px] font-medium flex-shrink-0 mt-0.5" style={{ color: 'var(--c-text-3)' }}>{r.date}</span>
                  </div>
                  <p className="text-[11px]" style={{ color: 'var(--c-text-3)' }}>
                    {r.sender.includes('fathom') ? '🎙 Fathom' : '🤖 Gemini'} · {r.preview.slice(0, 80)}...
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Tab ───────────────────────────────────────────────────────────────

export default function MeetingNotesTab() {
  const { state, dispatch, saveMeetingNote, createTask } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [transcript,    setTranscript]    = useState('');
  const [analyzing,     setAnalyzing]     = useState(false);
  const [analyzeError,  setAnalyzeError]  = useState<string | null>(null);
  const [result,        setResult]        = useState<MeetingAnalysisResult | null>(null);
  const [proposedTasks, setProposedTasks] = useState<ProposedTask[]>([]);
  const [showGmailModal,setShowGmailModal]= useState(false);
  const [createdCount,  setCreatedCount]  = useState(0);
  const [momCopied,     setMomCopied]     = useState(false);
  const [activeSection, setActiveSection] = useState<'quality' | 'decisions' | 'tasks' | 'mom' | 'insights'>('quality');
  const [analysisPreference, setAnalysisPreference] = useState<'general' | 'sales' | 'project-management' | 'technical'>('general');
  const [models, setModels] = useState<{ name: string; displayName: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState('');

  // Model list comes from Gemini's own API (not hardcoded) so it stays correct as Google
  // renames/deprecates model versions over time.
  useEffect(() => {
    fetch('/api/gemini-models')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setModels(data);
          setSelectedModel(data[0].name);
        }
      })
      .catch(() => {});
  }, []);

  // Handle ?prefill= query param for Calendar deep-linking
  useEffect(() => {
    const prefillEventId = searchParams.get('prefill');
    if (prefillEventId && state.meetingNotes) {
      const existing = state.meetingNotes.find(n => n.googleEventId === prefillEventId);
      if (existing) {
        setResult(existing.result);
        setProposedTasks(
          existing.result.actionItems.map((ai: any, i: number) => ({
            ...ai,
            status: existing.tasksCreated.length > 0 ? 'approved' : 'pending',
            assigneeId: null,
            category: 'operations',
            clientName: existing.result.meetingMeta.clientName,
          }))
        );
      }
    }
  }, [searchParams, state.meetingNotes]);

  const handleAnalyze = useCallback(async () => {
    if (transcript.trim().length < 100) {
      setAnalyzeError('Transcript is too short. Please paste at least a few paragraphs.');
      return;
    }
    setAnalyzeError(null);
    setAnalyzing(true);
    setResult(null);
    setProposedTasks([]);
    setCreatedCount(0);

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

      setResult(data as MeetingAnalysisResult);

      // Initialize proposed tasks with UI state
      const tasks: ProposedTask[] = (data.actionItems || [])
        .filter((ai: any) => ai.confidence !== 'low')
        .map((ai: any) => ({
          ...ai,
          status: 'pending' as const,
          assigneeId: null,
          category: 'operations',
          clientName: data.meetingMeta?.clientName || null,
        }));

      setProposedTasks(tasks);
      setActiveSection('tasks'); // Auto-switch to tasks to ask the user

      // Find client ID by name for persistence
      const clientName = data.meetingMeta?.clientName || '';
      const matchedClient = state.clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
      
      const newNote = {
        id: crypto.randomUUID(),
        clientId: matchedClient?.id || null,
        processedAt: new Date().toISOString(),
        transcriptSnippet: transcript,
        result: data,
        tasksCreated: [],
      };
      saveMeetingNote(newNote);
      alert(`Meeting Analyzed! Found ${tasks.length} action items to review.`);
    } catch (err: any) {
      setAnalyzeError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }, [transcript, state.clients, state.teamMembers, analysisPreference, selectedModel]);

  const handleAudioUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzeError(null);
    setAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/recordings/upload-audio', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audio transcription failed');

      setTranscript(data.transcript);
      // Wait for state to update, then analyze?
      // Actually we just put it in the box, the user can click analyze.
      // But auto-analyzing is nicer. We can just wait for them to click it or do it here.
      // Let's just set the transcript and let them click analyze so they can review the text first.
    } catch (err: any) {
      setAnalyzeError(err.message || 'Failed to upload audio.');
    } finally {
      setAnalyzing(false);
      // Reset input
      e.target.value = '';
    }
  }, []);

  const handleApprove = useCallback((index: number, updates: Partial<ProposedTask>) => {
    setProposedTasks(prev => prev.map((t, i) => i === index
      ? { ...t, ...updates, status: 'approved' }
      : t
    ));
  }, []);

  const handleReject = useCallback((index: number) => {
    setProposedTasks(prev => prev.map((t, i) => i === index
      ? { ...t, status: t.status === 'approved' ? 'pending' : 'rejected' }
      : t
    ));
  }, []);

  const handleApproveAll = useCallback(() => {
    setProposedTasks(prev => prev.map(t => {
      if (t.status === 'pending' && t.ownerSide === 'invictus') {
        // Find best match for owner name
        const ownerMember = state.teamMembers.find(m =>
          t.owner && m.name.toLowerCase().includes(t.owner.toLowerCase().split(' ')[0].toLowerCase())
        );
        return { ...t, status: 'approved', assigneeId: ownerMember?.id || state.currentUserId };
      }
      return t;
    }));
  }, [state.teamMembers, state.currentUserId]);

  const handleRejectAll = useCallback(() => {
    setProposedTasks(prev => prev.map(t =>
      t.status === 'pending' ? { ...t, status: 'rejected' } : t
    ));
  }, []);

  const approvedTasks   = proposedTasks.filter(t => t.status === 'approved');
  const pendingTasks    = proposedTasks.filter(t => t.status === 'pending');
  const rejectedTasks   = proposedTasks.filter(t => t.status === 'rejected');

  const handleCreateTasks = useCallback(async () => {
    const approved = proposedTasks.filter(t => t.status === 'approved' && t.ownerSide === 'invictus');
    if (approved.length === 0) return;

    // Save the meeting first (and wait for its real backend id) so every approved task can
    // be tagged with meeting-<id> — that tag is what makes a re-analysis of the same
    // meeting traceable back to the tasks it already created, instead of silently
    // duplicating them.
    let meetingId: string | null = null;
    if (result) {
      const matchedClient = state.clients.find(c => c.name.toLowerCase() === (result.meetingMeta?.clientName || '').toLowerCase());
      const note: MeetingNote = {
        id: crypto.randomUUID(),
        clientId: matchedClient?.id || null,
        processedAt: new Date().toISOString(),
        transcriptSnippet: transcript,
        result,
        tasksCreated: [],
      };
      meetingId = await saveMeetingNote(note);
    }
    const tags = meetingId ? ['meeting-generated', `meeting-${meetingId}`] : ['meeting-generated'];

    // createTask() (not a raw dispatch) so these actually sync to the backend — dispatching
    // CREATE_TASK directly only updates local state, which used to make meeting-derived
    // tasks vanish on refresh and stay invisible to everyone else.
    approved.forEach(t => {
      const clientId = resolveClientId(t.clientName, state.clients);
      createTask({
        title: t.title,
        description: t.description || '',
        clientId,
        category: (t.category || 'operations') as any,
        assignedTo: t.assigneeId ? [t.assigneeId] : [state.currentUserId],
        createdBy: state.currentUserId,
        priority: (t.priority || 'medium') as any,
        status: 'todo',
        deadline: t.deadline || null,
        estimatedHours: 2,
        tags,
      } as any);
    });

    setCreatedCount(approved.length);
    // Mark as approved so button shows success
    setTimeout(() => router.push('/tasks'), 1800);
  }, [proposedTasks, result, state.clients, state.currentUserId, transcript, createTask, saveMeetingNote, router]);

  const handleSendClientMOM = useCallback(() => {
    if (!result) return;
    const mom = result.momClient;
    const body = [
      mom.openingPara,
      '',
      'DECISIONS AGREED',
      ...(mom.keyDecisions || []).map(d => `• ${d}`),
      '',
      'NEXT STEPS — FROM INVICTUS',
      ...(mom.nextStepsInvictus || []).map(s => `• ${s}`),
      '',
      'NEXT STEPS — FROM YOUR SIDE',
      ...(mom.nextStepsClient || []).map(s => `• ${s}`),
      mom.nextMeetingNote ? '' : null,
      mom.nextMeetingNote || null,
      '',
      mom.closingPara,
      '',
      mom.signoff,
    ].filter(l => l !== null).join('\n');

    const url = `https://mail.google.com/mail/?view=cm&su=${encodeURIComponent(mom.subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  }, [result]);

  const handleCopyTeamMOM = useCallback(() => {
    if (!result) return;
    const m = result.momTeam;
    const text = [
      m.heading,
      '',
      'CLIENT SNAPSHOT',
      m.clientSnapshot,
      '',
      `DEAL STATUS: ${m.dealStatus}`,
      '',
      'WHAT WE COMMITTED',
      ...(m.whatWeCommitted || []).map(c => `• ${c}`),
      '',
      'WHAT THEY COMMITTED',
      ...(m.whatClientCommitted || []).map(c => `• ${c}`),
      '',
      'WATCH-OUTS 🚨',
      ...(m.watchOuts || []).map(w => `• ${w}`),
      '',
      'TEAM TASKS',
      ...(m.teamActions || []).map(a => `• ${a.who} → ${a.what} → by ${a.by}`),
      '',
      'INTERNAL NOTE (do not share)',
      m.internalNotes,
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setMomCopied(true);
      setTimeout(() => setMomCopied(false), 2500);
    });
  }, [result]);

  // ─── Render: Input Phase ────────────────────────────────────────────────

  if (!result) {
    return (
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 bg-surface-2 border border-border"
          >
            <span className="text-xl">🤖</span>
          </div>
          <h2 className="text-[28px] font-bold mb-2" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-syne-var)' }}>
            AI Meeting Notes
          </h2>
          <p className="text-[14px]" style={{ color: 'var(--c-text-3)' }}>
            Paste a transcript or import from Gmail · AI processes it into decisions, tasks &amp; MOMs
          </p>
        </div>

        {/* Transcript input */}
        <div
          className="rounded-2xl overflow-hidden mb-4"
          style={{ border: '1px solid var(--c-border)', background: 'var(--c-surface)' }}
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
            <span className="text-[13px] font-bold" style={{ color: 'var(--c-text-2)' }}>Transcript</span>
            <span className="ml-auto text-[11px]" style={{ color: 'var(--c-text-3)' }}>{transcript.length} chars</span>
          </div>
          <textarea
            className="w-full resize-none outline-none p-4 text-[13px] leading-relaxed"
            style={{
              background: 'transparent',
              color: 'var(--c-text)',
              minHeight: '220px',
              fontFamily: 'var(--font-grotesk-var)',
            }}
            placeholder="Paste your Fathom recap, Gemini notes, or any meeting transcript here...

Example: 'Sushil: Thanks for joining Dr. Rasheed. Let me walk you through the June numbers...'"
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
          />
        </div>

        {analyzeError && (
          <div
            className="rounded-xl px-4 py-3 mb-4 text-[13px]"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}
          >
            ⚠ {analyzeError}
          </div>
        )}

        {/* Action buttons and Settings */}
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[13px] font-bold" style={{ color: 'var(--c-text-2)' }}>Lens:</span>
            <select
              value={analysisPreference}
              onChange={e => setAnalysisPreference(e.target.value as any)}
              className="text-[13px] rounded-lg px-3 py-1.5 outline-none font-medium"
              style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
            >
              <option value="general">General (Effectiveness & Dynamics)</option>
              <option value="sales">Sales (Pain Points & Buying Signals)</option>
              <option value="project-management">Project Management (Risks & Timeline)</option>
              <option value="technical">Technical (Architecture & Infra)</option>
            </select>

            <span className="text-[13px] font-bold ml-2" style={{ color: 'var(--c-text-2)' }}>Model:</span>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              disabled={models.length === 0}
              className="text-[13px] rounded-lg px-3 py-1.5 outline-none font-medium disabled:opacity-50"
              style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
            >
              {models.length === 0 ? (
                <option>No models available</option>
              ) : (
                models.map(m => <option key={m.name} value={m.name}>{m.displayName}</option>)
              )}
            </select>
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
              ) : (
                <>Analyze Meeting</>
              )}
            </button>

            <button
              onClick={() => setShowGmailModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-[13px] transition-all hover:-translate-y-0.5"
              style={{
                background: 'var(--c-surface)',
                border: '1px solid var(--c-border)',
                color: 'var(--c-text-2)',
                flex: '0 0 auto'
              }}
            >
              📧 Import from Gmail
            </button>
            <label
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-[13px] transition-all hover:-translate-y-0.5 cursor-pointer"
              style={{
                background: 'var(--c-surface)',
                border: '1px solid var(--c-border)',
                color: 'var(--c-text-2)',
                flex: '0 0 auto'
              }}
            >
              🎙 Upload Audio
              <input 
                type="file" 
                accept="audio/*,video/*" 
                className="hidden" 
                onChange={handleAudioUpload}
                disabled={analyzing}
              />
            </label>
          </div>
        </div>

        {analyzing && (
          <div
            className="mt-8 rounded-xl p-8 text-center bg-surface border border-border"
          >
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-[14px] font-bold mb-1 text-text font-syne">
              Analyzing Meeting...
            </p>
            <p className="text-[12px] text-text-3">
              Processing transcript and extracting intelligence.
            </p>
          </div>
        )}

        {showGmailModal && (
          <GmailImportModal
            onClose={() => setShowGmailModal(false)}
            onSelect={body => setTranscript(body)}
          />
        )}

        {/* Recent Meetings */}
        {!analyzing && state.meetingNotes && state.meetingNotes.length > 0 && (
          <div className="mt-12">
            <h3 className="text-[16px] font-bold mb-4" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-syne-var)' }}>Recent Meeting Intelligence</h3>
            <div className="grid gap-3">
              {state.meetingNotes.map(m => (
                <div 
                  key={m.id} 
                  onClick={() => router.push(`/meetings/${m.id}`)}
                  className="rounded-xl p-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between group"
                  style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
                >
                  <div>
                    <h4 className="font-bold text-[14px] text-white group-hover:text-primary transition-colors">{m.result?.meetingMeta?.title || 'Meeting Notes'}</h4>
                    <p className="text-[12px] mt-1" style={{ color: 'var(--c-text-3)' }}>
                      {new Date(m.processedAt).toLocaleDateString()} · {m.result?.meetingMeta?.clientName || 'Internal'} · {m.tasksCreated?.length || 0} Tasks Extracted
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-gray-500 group-hover:text-primary transition-colors">arrow_forward_ios</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Render: Review Phase ────────────────────────────────────────────────

  const meta = result.meetingMeta;
  const sectionTabs = [
    { id: 'quality',   label: 'Quality & Talk Time' },
    { id: 'decisions', label: `Decisions (${result.decisions?.length || 0})` },
    { id: 'tasks',     label: `Tasks (${proposedTasks.length})`, badge: approvedTasks.length },
    { id: 'mom',       label: 'Minutes of Meeting' },
    { id: 'insights',  label: 'Deep Insights' },
  ] as const;

  return (
    <div className="w-full">
      {/* Back + title */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button
            onClick={() => { setResult(null); setTranscript(''); }}
            className="flex items-center gap-1.5 text-[12px] font-bold mb-3 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--c-text-3)' }}
          >
            ← Back to input
          </button>
          <h2 className="text-[22px] font-bold" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-syne-var)' }}>
            {meta.title || 'Meeting Analysis'}
          </h2>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--c-text-3)' }}>
            {meta.clientName && <span>{meta.clientName} · </span>}
            {meta.meetingType?.replace(/_/g, ' ')}
            {meta.date && <span> · {new Date(meta.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
            {meta.durationMinutes && <span> · {meta.durationMinutes} min</span>}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Score pill */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[13px] font-bold"
            style={{
              background: result.meetingQuality.score >= 7
                ? 'rgba(42,177,130,0.12)' : result.meetingQuality.score >= 5
                ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
              color: result.meetingQuality.score >= 7 ? '#2AB182' : result.meetingQuality.score >= 5 ? '#F59E0B' : '#EF4444',
            }}
          >
            {result.meetingQuality.score}/10 — {result.meetingQuality.rating}
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-6"
        style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border)' }}
      >
        {sectionTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className="relative flex-1 py-2 px-3 rounded-lg text-[12px] font-bold transition-all"
            style={{
              background: activeSection === tab.id ? 'var(--c-surface)' : 'transparent',
              color: activeSection === tab.id ? 'var(--c-text)' : 'var(--c-text-3)',
              boxShadow: activeSection === tab.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {tab.label}
            {'badge' in tab && tab.badge > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
                style={{ background: 'var(--c-primary)', color: 'white' }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Quality & Talk Time ── */}
      {activeSection === 'quality' && (
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

          {result.openQuestions && result.openQuestions.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: 'var(--c-surface)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <h3 className="text-[13px] font-bold uppercase tracking-wider mb-3" style={{ color: '#F59E0B' }}>
                ❓ Open Questions ({result.openQuestions.length})
              </h3>
              <ul className="space-y-2">
                {result.openQuestions.map((q, i) => (
                  <li key={i} className="text-[13px] flex items-start gap-2" style={{ color: 'var(--c-text-2)' }}>
                    <span className="text-amber-500 flex-shrink-0 mt-0.5">•</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Lead cycle */}
          {result.leadCycleUpdate && (
            <div className="rounded-xl p-5" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <h3 className="text-[13px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--c-text-2)' }}>Lead Cycle Update</h3>
              <div className="flex items-center gap-3">
                <span
                  className="px-3 py-1.5 rounded-lg text-[12px] font-bold capitalize"
                  style={{ background: 'rgba(42,177,130,0.1)', color: '#2AB182' }}
                >
                  {result.leadCycleUpdate.currentStage?.replace(/_/g, ' ')}
                </span>
                {result.leadCycleUpdate.stageChange && (
                  <span className="text-[12px]" style={{ color: 'var(--c-text-3)' }}>← Stage changed this meeting</span>
                )}
              </div>
              {result.leadCycleUpdate.commercialUpdate?.agreedValue && (
                <p className="text-[13px] mt-2" style={{ color: 'var(--c-text-2)' }}>
                  Agreed value: <strong style={{ color: 'var(--c-text)' }}>{result.leadCycleUpdate.commercialUpdate.agreedValue}</strong>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Decisions ── */}
      {activeSection === 'decisions' && (
        <div className="space-y-3">
          {(!result.decisions || result.decisions.length === 0) ? (
            <div className="text-center py-12 rounded-xl" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <p style={{ color: 'var(--c-text-3)' }}>No decisions extracted from this transcript.</p>
            </div>
          ) : result.decisions.map((d, i) => (
            <div
              key={i}
              className="rounded-xl p-4"
              style={{
                background: 'var(--c-surface)',
                border: `1px solid ${d.isBinding ? 'rgba(42,177,130,0.3)' : 'var(--c-border)'}`,
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-[14px] font-semibold" style={{ color: 'var(--c-text)' }}>{d.decision}</p>
                <span
                  className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={d.isBinding
                    ? { background: 'rgba(42,177,130,0.1)', color: '#2AB182' }
                    : { background: 'var(--c-surface-2)', color: 'var(--c-text-3)' }
                  }
                >
                  {d.isBinding ? '✓ Binding' : 'Non-binding'}
                </span>
              </div>
              {d.decidedBy && (
                <p className="text-[12px] mb-2" style={{ color: 'var(--c-text-3)' }}>Decided by: {d.decidedBy}</p>
              )}
              {d.sourceQuote && (
                <blockquote
                  className="text-[11px] italic px-3 py-2 rounded-lg mt-2"
                  style={{ color: 'var(--c-text-3)', background: 'var(--c-surface-2)', borderLeft: '3px solid var(--c-border)' }}
                >
                  "{d.sourceQuote}"
                </blockquote>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Tasks ── */}
      {activeSection === 'tasks' && (
        <div>
          {/* Bulk actions bar */}
          <div
            className="flex items-center justify-between p-3 rounded-xl mb-4"
            style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border)' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-bold" style={{ color: 'var(--c-text-2)' }}>
                {proposedTasks.length} tasks · {approvedTasks.length} approved · {rejectedTasks.length} rejected
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleApproveAll}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
                style={{ background: 'rgba(42,177,130,0.1)', color: '#2AB182', border: '1px solid rgba(42,177,130,0.2)' }}
              >
                Approve All
              </button>
              <button
                onClick={handleRejectAll}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                Reject All
              </button>
            </div>
          </div>

          {proposedTasks.length === 0 ? (
            <div className="text-center py-12 rounded-xl" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <p style={{ color: 'var(--c-text-3)' }}>No high-confidence action items were extracted.</p>
            </div>
          ) : (
            <div>
              {proposedTasks.map((task, i) => (
                <TaskApprovalCard
                  key={i}
                  task={task}
                  index={i}
                  onApprove={(updates) => handleApprove(i, updates)}
                  onReject={() => handleReject(i)}
                />
              ))}
            </div>
          )}

          {/* Create tasks CTA */}
          <div
            className="sticky bottom-0 pt-4 pb-2 mt-4"
            style={{ background: 'linear-gradient(to top, var(--c-bg) 70%, transparent)' }}
          >
            <button
              onClick={handleCreateTasks}
              disabled={approvedTasks.filter(t => t.ownerSide === 'invictus').length === 0 || createdCount > 0}
              className="w-full py-4 rounded-xl font-bold text-[15px] text-white transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.99]"
              style={{ background: 'linear-gradient(135deg, #2AB182, #1E9970)' }}
            >
              {createdCount > 0
                ? `✓ ${createdCount} tasks created — redirecting...`
                : `Create ${approvedTasks.filter(t => t.ownerSide === 'invictus').length} Approved Tasks →`
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Minutes of Meeting ── */}
      {activeSection === 'mom' && (
        <div className="space-y-6">
          {/* Client MOM */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ background: 'var(--c-surface-2)', borderBottom: '1px solid var(--c-border)' }}
            >
              <div>
                <h3 className="text-[14px] font-bold" style={{ color: 'var(--c-text)' }}>Client MOM</h3>
                <p className="text-[11px]" style={{ color: 'var(--c-text-3)' }}>{result.momClient?.subject}</p>
              </div>
              <button
                onClick={handleSendClientMOM}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(42,177,130,0.1)', color: '#2AB182', border: '1px solid rgba(42,177,130,0.2)' }}
              >
                📧 Open in Gmail →
              </button>
            </div>
            <div className="p-5" style={{ background: 'var(--c-surface)' }}>
              <p className="text-[13px] mb-3" style={{ color: 'var(--c-text-2)' }}>{result.momClient?.greeting}</p>
              <p className="text-[13px] mb-4 leading-relaxed" style={{ color: 'var(--c-text-2)' }}>{result.momClient?.openingPara}</p>

              {result.momClient?.keyDecisions?.length > 0 && (
                <div className="mb-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-3)' }}>Decisions Agreed</p>
                  <ul className="space-y-1.5">
                    {result.momClient.keyDecisions.map((d, i) => (
                      <li key={i} className="text-[13px] flex items-start gap-2" style={{ color: 'var(--c-text-2)' }}>
                        <span style={{ color: '#2AB182' }}>•</span> {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.momClient?.nextStepsInvictus?.length > 0 && (
                <div className="mb-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-3)' }}>Next Steps — Invictus</p>
                  <ul className="space-y-1.5">
                    {result.momClient.nextStepsInvictus.map((s, i) => (
                      <li key={i} className="text-[13px] flex items-start gap-2" style={{ color: 'var(--c-text-2)' }}>
                        <span style={{ color: '#2AB182' }}>•</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[13px] mt-4 mb-2" style={{ color: 'var(--c-text-2)' }}>{result.momClient?.closingPara}</p>
              <pre className="text-[12px] whitespace-pre-wrap" style={{ color: 'var(--c-text-3)', fontFamily: 'inherit' }}>{result.momClient?.signoff}</pre>
            </div>
          </div>

          {/* Team MOM */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ background: 'var(--c-surface-2)', borderBottom: '1px solid var(--c-border)' }}
            >
              <div>
                <h3 className="text-[14px] font-bold" style={{ color: 'var(--c-text)' }}>Team MOM</h3>
                <p className="text-[11px]" style={{ color: 'var(--c-text-3)' }}>{result.momTeam?.heading}</p>
              </div>
              <button
                onClick={handleCopyTeamMOM}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold transition-all hover:-translate-y-0.5"
                style={{
                  background: momCopied ? 'rgba(42,177,130,0.15)' : 'var(--c-surface)',
                  color: momCopied ? '#2AB182' : 'var(--c-text-2)',
                  border: '1px solid var(--c-border)',
                }}
              >
                {momCopied ? '✓ Copied!' : '📋 Copy Team MOM'}
              </button>
            </div>
            <div className="p-5 space-y-4" style={{ background: 'var(--c-surface)' }}>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-3)' }}>Client Snapshot</p>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--c-text-2)' }}>{result.momTeam?.clientSnapshot}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-3)' }}>Deal Status</p>
                <p className="text-[13px]" style={{ color: 'var(--c-text-2)' }}>{result.momTeam?.dealStatus}</p>
              </div>
              {result.momTeam?.watchOuts?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#F59E0B' }}>Watch-Outs 🚨</p>
                  <ul className="space-y-1">
                    {result.momTeam.watchOuts.map((w, i) => (
                      <li key={i} className="text-[13px] flex items-start gap-2" style={{ color: 'var(--c-text-2)' }}>
                        <span style={{ color: '#F59E0B' }}>⚠</span> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.momTeam?.teamActions?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-3)' }}>Team Tasks</p>
                  <ul className="space-y-1.5">
                    {result.momTeam.teamActions.map((a, i) => (
                      <li key={i} className="text-[12px] font-mono" style={{ color: 'var(--c-text-2)' }}>
                        <strong>{a.who}</strong> → {a.what} → <span style={{ color: '#2AB182' }}>{a.by}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.momTeam?.internalNotes && (
                <div
                  className="rounded-xl px-4 py-3"
                  style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#EF4444' }}>Internal Note — Do Not Share</p>
                  <p className="text-[12px] italic" style={{ color: 'var(--c-text-2)' }}>{result.momTeam.internalNotes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Deep Insights ── */}
      {activeSection === 'insights' && (
        <div className="space-y-6">
          {result.summary && (
            <div className="rounded-xl p-5" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <h3 className="text-[14px] font-bold mb-2" style={{ color: 'var(--c-text)' }}>Meeting Summary</h3>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--c-text-2)' }}>{result.summary}</p>
            </div>
          )}

          {result.keyPoints && result.keyPoints.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <h3 className="text-[14px] font-bold mb-3" style={{ color: 'var(--c-text)' }}>Key Takeaways</h3>
              <ul className="space-y-2">
                {result.keyPoints.map((kp, i) => (
                  <li key={i} className="text-[13px] flex items-start gap-2" style={{ color: 'var(--c-text-2)' }}>
                    <span style={{ color: '#7C3AED' }}>•</span> {kp}
                  </li>
                ))}
              </ul>
            </div>
          )}

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
        </div>
      )}

    </div>
  );
}
