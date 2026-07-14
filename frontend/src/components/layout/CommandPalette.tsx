'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Folder, CheckSquare, Users, ArrowRight, Target, Zap, Layers, AlignLeft, X, LayoutDashboard } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

const STATUS_COLORS: Record<string, string> = {
  todo: '#64748B', in_progress: '#3B82F6', in_review: '#F59E0B',
  blocked: '#EF4444', done: '#10B981', paused: '#F97316', rework: '#8B5CF6',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#EF4444', high: '#F97316', medium: '#F59E0B', low: '#94A3B8',
};

const QUICK_CREATE_OPTIONS = [
  { label: 'Goal', action: 'create_goal', icon: Target, color: '#7C3AED', desc: 'Project or milestone', type: 'goal' },
  { label: 'Task', action: 'create_task', icon: CheckSquare, color: '#2AB182', desc: 'A specific work item', type: 'task' },
  { label: 'Subtask', action: 'create_subtask', icon: Layers, color: '#3B82F6', desc: 'Part of a task', type: 'subtask' },
];

const STATIC_ROUTES = [
  { label: 'Dashboard', icon: LayoutDashboard, url: '/dashboard' },
  { label: 'Task Board', icon: CheckSquare, url: '/tasks' },
  { label: 'Clients', icon: Folder, url: '/clients' },
  { label: 'Team Directory', icon: Users, url: '/team' },
  { label: 'Calendar', icon: AlignLeft, url: '/calendar' },
  { label: 'Team Dashboard', icon: Zap, url: '/team-dashboard' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { state } = useApp();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    const openEvent = () => setOpen(true);
    document.addEventListener('keydown', down);
    window.addEventListener('open-command-palette', openEvent);
    return () => {
      document.removeEventListener('keydown', down);
      window.removeEventListener('open-command-palette', openEvent);
    };
  }, []);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const close = () => setOpen(false);

  if (!open) return null;

  const q = query.toLowerCase().trim();

  const taskResults = q.length > 0
    ? state.tasks
        .filter(t =>
          (t.title || '').toLowerCase().includes(q) ||
          (t.id || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
        )
        .slice(0, 6)
    : [];

  const clientResults = q.length > 0
    ? state.clients
        .filter(c => (c.name || '').toLowerCase().includes(q) || (c.code || (c as any).short_code || '').toLowerCase().includes(q))
        .slice(0, 3)
    : [];

  const pageResults = q.length > 0
    ? STATIC_ROUTES.filter(r => r.label.toLowerCase().includes(q))
    : STATIC_ROUTES;

  const handleNavigate = (url: string) => {
    close();
    router.push(url);
  };

  const handleOpenTask = (taskId: string) => {
    close();
    window.dispatchEvent(new CustomEvent('open-task-drawer', { detail: { taskId } }));
  };

  const handleQuickCreate = (type: string) => {
    close();
    window.dispatchEvent(new CustomEvent('open-new-task-modal', {
      detail: { title: query.trim(), type }
    }));
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center pt-[10vh] bg-black/60 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'var(--c-surface)',
          border: '1px solid var(--c-border)',
          animation: 'paletteIn 0.18s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 py-3" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <Search className="w-5 h-5 mr-3 flex-shrink-0" style={{ color: '#2AB182' }} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent outline-none text-[15px]"
            style={{ color: 'var(--c-text)' }}
            placeholder="Search tasks, clients, or type to create…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') close(); }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--c-text-3)' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd
            className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold"
            style={{ background: 'var(--c-surface-3)', color: 'var(--c-text-2)', border: '1px solid var(--c-border)' }}
          >
            esc
          </kbd>
        </div>

        <div className="max-h-[480px] overflow-y-auto custom-scrollbar" style={{ paddingBottom: 8 }}>

          {/* ── Quick Create (always shown when query has text) ── */}
          {q.length > 0 && (
            <div className="px-3 pt-4 pb-2">
              <div
                className="text-[10px] font-bold uppercase tracking-wider mb-2 px-1"
                style={{ color: 'var(--c-text-3)' }}
              >
                Quick Create
              </div>
              <div className="flex flex-col gap-1">
                {QUICK_CREATE_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.action}
                      onClick={() => handleQuickCreate(opt.type)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left w-full transition hover:opacity-90"
                      style={{
                        background: `${opt.color}12`,
                        border: `1px solid ${opt.color}30`,
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${opt.color}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: opt.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold" style={{ color: opt.color }}>
                          Create {opt.label}
                        </div>
                        <div
                          className="text-[13px] font-semibold truncate"
                          style={{ color: 'var(--c-text)' }}
                        >
                          &ldquo;{query.trim()}&rdquo;
                        </div>
                      </div>
                      <div
                        className="text-[10px] font-bold uppercase tracking-wider flex-shrink-0"
                        style={{ color: opt.color, opacity: 0.6 }}
                      >
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Task Results ── */}
          {taskResults.length > 0 && (
            <div className="px-3 pt-4 pb-2">
              <div
                className="text-[10px] font-bold uppercase tracking-wider mb-2 px-1"
                style={{ color: 'var(--c-text-3)' }}
              >
                Tasks — {taskResults.length} found
              </div>
              <div className="flex flex-col gap-1">
                {taskResults.map(task => {
                  const client = state.clients.find(c => c.id === task.clientId);
                  const statusColor = STATUS_COLORS[task.status] || '#64748B';
                  const priorityColor = PRIORITY_COLORS[task.priority] || '#94A3B8';
                  const isOverdue = task.deadline && task.status !== 'done' && task.deadline < todayStr;
                  return (
                    <button
                      key={task.id}
                      onClick={() => handleOpenTask(task.id)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left w-full transition-colors group"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--c-surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
                        style={{ background: statusColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="text-[13px] font-semibold truncate"
                            style={{ color: 'var(--c-text)' }}
                          >
                            {task.title}
                          </span>
                          <span
                            className="text-[9px] font-mono flex-shrink-0"
                            style={{ color: 'var(--c-text-3)' }}
                          >
                            {task.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {client && (
                            <span className="text-[11px] font-bold" style={{ color: '#2AB182' }}>
                              {client.code}
                            </span>
                          )}
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                            style={{ background: `${priorityColor}18`, color: priorityColor }}
                          >
                            {task.priority}
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                            style={{ background: `${statusColor}18`, color: statusColor }}
                          >
                            {task.status.replace(/_/g, ' ')}
                          </span>
                          {task.deadline && (
                            <span
                              className="text-[10px]"
                              style={{ color: isOverdue ? '#EF4444' : 'var(--c-text-3)' }}
                            >
                              {isOverdue ? '⚠ ' : ''}
                              {new Date(task.deadline).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className="text-[10px] font-semibold flex-shrink-0 self-center px-2 py-1 rounded-lg"
                        style={{ background: 'var(--c-surface-3)', color: 'var(--c-text-3)' }}
                      >
                        Open ↗
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Client Results ── */}
          {clientResults.length > 0 && (
            <div className="px-3 pt-4 pb-2">
              <div
                className="text-[10px] font-bold uppercase tracking-wider mb-2 px-1"
                style={{ color: 'var(--c-text-3)' }}
              >
                Clients
              </div>
              <div className="flex flex-col gap-1">
                {clientResults.map(client => {
                  const clientTasks = state.tasks.filter(
                    t => t.clientId === client.id && t.status !== 'done'
                  );
                  return (
                    <button
                      key={client.id}
                      onClick={() => handleNavigate(`/clients/${client.id}`)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left w-full transition-colors"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--c-surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                        style={{ background: client.color }}
                      >
                        {(client.code || (client as any).short_code || 'CL').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-[13px] font-semibold"
                          style={{ color: 'var(--c-text)' }}
                        >
                          {client.name}
                        </div>
                        <div className="text-[11px]" style={{ color: 'var(--c-text-3)' }}>
                          {clientTasks.length} active tasks · {client.category}
                        </div>
                      </div>
                      <Folder className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--c-text-3)' }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Pages / Navigate ── */}
          {pageResults.length > 0 && (
            <div className="px-3 pt-4 pb-2">
              <div
                className="text-[10px] font-bold uppercase tracking-wider mb-2 px-1"
                style={{ color: 'var(--c-text-3)' }}
              >
                {q ? 'Pages' : 'Navigate'}
              </div>
              <div className="flex flex-col gap-1">
                {pageResults.map(page => {
                  const Icon = page.icon;
                  return (
                    <button
                      key={page.url}
                      onClick={() => handleNavigate(page.url)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-left w-full transition-colors"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--c-surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--c-text-3)' }} />
                      <span
                        className="text-[13px] font-medium"
                        style={{ color: 'var(--c-text-2)' }}
                      >
                        {page.label}
                      </span>
                      <span className="ml-auto text-[10px]" style={{ color: 'var(--c-text-3)' }}>
                        {page.url}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── No Results ── */}
          {q.length > 0 &&
            taskResults.length === 0 &&
            clientResults.length === 0 &&
            pageResults.length === 0 && (
              <div className="p-8 text-center" style={{ color: 'var(--c-text-3)' }}>
                <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-[13px]">No results for &ldquo;{query}&rdquo;</p>
                <p className="text-[11px] mt-1 opacity-70">
                  Use the Quick Create options above to create a new task
                </p>
              </div>
            )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2.5 flex items-center justify-between text-[11px] font-medium"
          style={{
            borderTop: '1px solid var(--c-border)',
            background: 'var(--c-surface-2)',
            color: 'var(--c-text-3)',
          }}
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd
                className="rounded px-1"
                style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
              >
                ↵
              </kbd>{' '}
              open / create
            </span>
            <span className="flex items-center gap-1">
              <kbd
                className="rounded px-1"
                style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
              >
                esc
              </kbd>{' '}
              close
            </span>
          </div>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Invictus Command Palette
          </span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes paletteIn {
          from {
            opacity: 0;
            transform: translateY(-14px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
