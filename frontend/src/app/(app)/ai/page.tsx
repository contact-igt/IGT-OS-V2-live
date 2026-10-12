'use client';
import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { TEAM_MEMBERS } from '@/lib/data';
import { aiFetch } from '@/lib/aiFetch';

// ──────────────────────────────────────────────
// ROLE HIERARCHY & ACCESS CONTROL
// ──────────────────────────────────────────────
const LEADERSHIP_IDS = ['u-sushil', 'u-anitha', 'u-abhilash'];
const LEADERSHIP_ROLES = ['super_admin', 'admin', 'ops'];

function isLeadership(userId: string, role: string): boolean {
  return LEADERSHIP_IDS.includes(userId) || LEADERSHIP_ROLES.includes(role);
}

function getAccessibleData(state: any, currentUser: any) {
  if (!currentUser) return { tasks: [], teamMembers: [], clients: [] };

  const isLeader = isLeadership(currentUser.id, currentUser.role);

  if (isLeader) {
    return {
      tasks: state.tasks || [],
      teamMembers: state.teamMembers || [],
      clients: state.clients || [],
    };
  }

  // Team member: only their department
  const myDepartment = currentUser.department;
  const departmentMembers = (state.teamMembers || []).filter(
    (m: any) => m.department === myDepartment
  );
  const departmentMemberIds = new Set(departmentMembers.map((m: any) => m.id));
  const departmentTasks = (state.tasks || []).filter((t: any) =>
    t.assignedTo?.some((uid: string) => departmentMemberIds.has(uid))
  );

  return {
    tasks: departmentTasks,
    teamMembers: departmentMembers,
    clients: state.clients || [],
  };
}

function buildSystemPrompt(currentUser: any, accessibleData: any): string {
  const isLeader = isLeadership(currentUser.id, currentUser.role);

  const teamInfo = accessibleData.teamMembers.map((m: any) =>
    `- ${m.name} (${m.department}, ${m.roleTag || m.role})`
  ).join('\n') || 'None';

  const clientInfo = accessibleData.clients.slice(0, 15).map((c: any) =>
    `- ${c.name} [${c.code}] — ${c.category} — Retainer: ₹${(c.monthlyRetainerINR || 0).toLocaleString()}`
  ).join('\n') || 'No clients';

  const taskInfo = accessibleData.tasks.slice(0, 30).map((t: any) => {
    const assignees = (t.assignedTo || []).map((id: string) => {
      const m = accessibleData.teamMembers.find((tm: any) => tm.id === id) ||
                TEAM_MEMBERS.find((tm: any) => tm.id === id);
      return m?.name || id;
    }).join(', ') || 'Unassigned';
    const client = accessibleData.clients.find((c: any) => c.id === t.clientId);
    const dl = t.deadline ? new Date(t.deadline).toLocaleDateString('en-IN') : 'None';
    return `- [${(t.priority || 'medium').toUpperCase()}] ${t.title} | ${t.status} | ${assignees} | ${client?.name || 'Internal'} | Due: ${dl}`;
  }).join('\n') || 'No tasks yet — tasks will appear as the team adds them.';

  const scopeNote = isLeader
    ? 'You have FULL ACCESS to all team data, all departments, all tasks, and all client financials.'
    : `You have access ONLY to your department (${currentUser.department}). You can see what your teammates in the same department are working on, but NOT other departments.`;

  return `You are Invictus Cortex, the private AI assistant for Invictus Global Tech, a digital marketing agency.

CURRENT USER: ${currentUser.name}
ROLE: ${currentUser.roleTag || currentUser.role} | DEPARTMENT: ${currentUser.department || 'N/A'}
ACCESS: ${isLeader ? 'Full Leadership Access' : 'Department Scope Only'}

${scopeNote}

TEAM MEMBERS IN SCOPE:
${teamInfo}

CLIENTS:
${clientInfo}

TASKS IN SCOPE:
${taskInfo}

RULES:
${isLeader
  ? '- You can see all team members, tasks, clients, and financial data.\n- You can answer strategic questions about agency health and performance.'
  : `- You can ONLY see and discuss tasks from ${currentUser.department} department.\n- NEVER reveal tasks, salaries, or data from other departments.\n- If asked about other departments, say: "I can only help with ${currentUser.department} tasks."`}

STYLE: Be concise, direct, use bullet points. Address the user by first name: ${(currentUser.name || '').split(' ')[0] || 'there'}.`;
}

function getQuickPrompts(isLeader: boolean, department: string) {
  if (isLeader) {
    return [
      { label: 'Agency Overview', icon: 'dashboard', color: '#2AB182', query: 'Give me a full overview of the agency — tasks, client health, and any blockers.' },
      { label: 'Critical Tasks', icon: 'warning', color: '#EF4444', query: 'Show all critical and overdue tasks across all teams.' },
      { label: 'Team Workload', icon: 'groups', color: '#8B5CF6', query: 'Who has the highest workload right now? Show me a workload summary per team member.' },
      { label: 'Client Health', icon: 'business', color: '#F59E0B', query: 'Which clients need urgent attention or have overdue deliverables?' },
    ];
  }
  return [
    { label: 'My Tasks', icon: 'task', color: '#2AB182', query: 'What are all the active tasks assigned to me?' },
    { label: 'Team Tasks', icon: 'groups', color: '#8B5CF6', query: `What is the ${department} team working on right now?` },
    { label: 'Overdue', icon: 'warning', color: '#EF4444', query: 'Are there any overdue tasks in our team?' },
    { label: 'Client Update', icon: 'business', color: '#F59E0B', query: 'What is the current status of our client work?' },
  ];
}

// Simple markdown-like renderer (no external deps)
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:var(--c-surface-2);padding:1px 6px;border-radius:4px;font-family:monospace;color:var(--c-primary)">$1</code>')
    .replace(/^### (.*)/gm, '<h3 style="font-size:14px;font-weight:700;margin:8px 0 4px">$1</h3>')
    .replace(/^## (.*)/gm, '<h2 style="font-size:15px;font-weight:700;margin:10px 0 4px">$1</h2>')
    .replace(/^# (.*)/gm, '<h1 style="font-size:16px;font-weight:700;margin:12px 0 4px">$1</h1>')
    .replace(/^[-*] (.*)/gm, '<li style="margin:2px 0 2px 16px;list-style:disc">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export default function AIPage() {
  const { state } = useApp();
  const { user: authUser } = useAuth();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const currentUser = authUser
    ? (state.teamMembers || []).find((m: any) => m.id === authUser.id) || {
        ...authUser,
        initials: authUser.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U',
      }
    : null;

  const isLeader = currentUser ? isLeadership(currentUser.id, currentUser.role) : false;
  const accessibleData = getAccessibleData(state, currentUser);
  const quickPrompts = getQuickPrompts(isLeader, currentUser?.department || '');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend(overrideQuery?: string) {
    const q = (overrideQuery ?? query).trim();
    if (!q || loading || !currentUser) return;

    setQuery('');
    setError(null);

    const newMessages = [...messages, { role: 'user' as const, content: q }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const systemPrompt = buildSystemPrompt(currentUser, accessibleData);
      // Routed through our own backend so the OpenAI key stays server-side — this used to
      // call api.openai.com directly from the browser with NEXT_PUBLIC_OPENAI_API_KEY,
      // which would expose the key to anyone inspecting network requests.
      const response = await aiFetch('/api/cortex-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, messages: newMessages }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || `API Error ${response.status}`);
      }

      const data = await response.json();
      const reply = data.reply || 'No response received.';
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setError(err.message || 'Failed to reach Invictus Cortex. Check your API key.');
      setMessages(newMessages);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const accessBadge = isLeader ? (
    <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
      style={{ background: 'rgba(42,177,130,0.12)', color: '#2AB182', border: '1px solid rgba(42,177,130,0.25)' }}>
      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
      Full Access — Leadership
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
      style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.25)' }}>
      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
      {currentUser?.department || 'Team'} Scope Only
    </span>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '900px', margin: '0 auto', width: '100%', gap: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--c-border)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #2AB182, #1a8c61)', boxShadow: '0 4px 12px rgba(42,177,130,0.3)' }}>
            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--c-text)', margin: 0 }}>Invictus Cortex</h1>
            <p style={{ fontSize: '12px', color: 'var(--c-text-3)', margin: 0 }}>Role-scoped AI · {currentUser?.name || '—'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {accessBadge}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Chat area */}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', minHeight: 0 }}>
            {messages.length === 0 && !loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', gap: '32px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '72px', height: '72px', borderRadius: '20px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #2AB182, #1a8c61)', boxShadow: '0 8px 24px rgba(42,177,130,0.3)' }}>
                    <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '36px', fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                  </div>
                  <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--c-text)', margin: '0 0 8px' }}>Ask Invictus Cortex</h2>
                  <p style={{ fontSize: '14px', color: 'var(--c-text-3)', maxWidth: '420px', lineHeight: '1.6' }}>
                    {isLeader
                      ? 'You have full leadership access. Ask about any task, team member, client, or agency health metric.'
                      : `Your access is scoped to ${currentUser?.department || 'your'} department only. Ask about your team's tasks, clients, and progress.`}
                  </p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '600px' }}>
                  {quickPrompts.map(p => (
                    <button key={p.label} onClick={() => handleSend(p.query)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '24px', border: '1px solid var(--c-border)', background: 'var(--c-surface)', color: 'var(--c-text-2)', cursor: 'pointer', fontSize: '13px', fontWeight: 700, transition: 'all 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: p.color, fontVariationSettings: "'FILL' 1" }}>{p.icon}</span>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: msg.role === 'assistant' ? 'linear-gradient(135deg, #2AB182, #1a8c61)' : 'var(--c-primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                      {msg.role === 'assistant'
                        ? <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                        : <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>{currentUser?.initials || 'U'}</span>}
                    </div>
                    <div style={{
                      maxWidth: '78%', borderRadius: '16px', padding: '12px 16px', fontSize: '14px', lineHeight: '1.6',
                      borderTopRightRadius: msg.role === 'user' ? '4px' : '16px',
                      borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                      background: msg.role === 'user' ? 'var(--c-primary)' : 'var(--c-surface)',
                      color: msg.role === 'user' ? '#fff' : 'var(--c-text)',
                      border: msg.role === 'assistant' ? '1px solid var(--c-border)' : 'none',
                    }}>
                      {msg.role === 'assistant'
                        ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                        : msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #2AB182, #1a8c61)' }}>
                      <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '14px 18px', borderRadius: '16px', borderTopLeftRadius: '4px', background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                      {[0, 150, 300].map(d => (
                        <span key={d} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2AB182', display: 'inline-block', animation: 'bounce 1s infinite', animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
                {error && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '13px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', flexShrink: 0 }}>error</span>
                    {error}
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ paddingTop: '16px', borderTop: '1px solid var(--c-border)' }}>
            {messages.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px', alignItems: 'center' }}>
                {quickPrompts.slice(0, 3).map(p => (
                  <button key={p.label} onClick={() => handleSend(p.query)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--c-border)', background: 'var(--c-surface)', color: 'var(--c-text-3)', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: p.color, fontVariationSettings: "'FILL' 1" }}>{p.icon}</span>
                    {p.label}
                  </button>
                ))}
                <button onClick={() => { setMessages([]); setError(null); }}
                  style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--c-border)', background: 'var(--c-surface)', color: 'var(--c-text-3)', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>refresh</span>
                  New Chat
                </button>
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', borderRadius: '16px', border: '1px solid var(--c-border)', padding: '12px', background: 'var(--c-surface)' }}>
              <textarea
                ref={textareaRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isLeader ? 'Ask about any task, team, or client...' : `Ask about your ${currentUser?.department || ''} tasks...`}
                rows={1}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--c-text)', fontSize: '14px', resize: 'none', fontFamily: 'inherit', lineHeight: '1.5', maxHeight: '120px', overflow: 'auto' }}
                onInput={e => {
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!query.trim() || loading}
                style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: query.trim() && !loading ? 'pointer' : 'not-allowed', opacity: query.trim() && !loading ? 1 : 0.4, background: query.trim() && !loading ? 'var(--c-primary)' : 'var(--c-surface-2)', transition: 'all 0.2s' }}>
                <span className="material-symbols-outlined" style={{ color: query.trim() && !loading ? '#fff' : 'var(--c-text-3)', fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>send</span>
              </button>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--c-text-3)', textAlign: 'center', marginTop: '8px' }}>
              Powered by GPT-4o mini · {isLeader ? 'Full agency access' : `${currentUser?.department} only`} · Enter to send
            </p>
          </div>
        </div>
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }`}</style>
    </div>
  );
}
