'use client';
import { useState, useMemo } from 'react';
import { Task, PRIORITY_CONFIG, STATUS_CONFIG, TeamMember, getClientById } from '@/lib/data';

interface Props {
  tasks: Task[];
  teamMembers: TeamMember[];
  onTaskClick: (id: string) => void;
}

type SubTab = 'overall' | 'member';

const STATUS_COLORS: Record<string, string> = {
  todo: '#64748B',
  in_progress: '#3B82F6',
  in_review: '#F59E0B',
  blocked: '#EF4444',
  done: '#2AB182',
  paused: '#94A3B8',
  cancelled: '#64748B',
};

const STATUS_ORDER = ['in_progress', 'in_review', 'blocked', 'todo', 'paused', 'done', 'cancelled'];

function formatDeadline(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isOverdue(task: Task): boolean {
  if (!task.deadline) return false;
  if (task.status === 'done' || task.status === 'cancelled') return false;
  const deadline = new Date(task.deadline + 'T00:00:00');
  return deadline < getToday();
}

function isThisWeek(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const today = getToday();
  const deadline = new Date(dateStr + 'T00:00:00');
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  return deadline >= today && deadline <= nextWeek;
}

function isThisMonth(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const now = new Date();
  const d = new Date(dateStr);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

// ─── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ initials, color, size = 44 }: { initials: string; color: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontWeight: 700,
        fontSize: size * 0.36,
        color: '#fff',
        letterSpacing: '0.02em',
      }}
    >
      {initials}
    </div>
  );
}

// ─── Status Chip ─────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? { label: status, color: '#94A3B8', bg: '#94A3B820' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        color: cfg.color,
        background: cfg.bg,
        whiteSpace: 'nowrap',
        border: `1px solid ${cfg.color}33`,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: cfg.color,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
}

// ─── Priority Badge ──────────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] ?? { label: priority, color: '#94A3B8', bg: '#94A3B820' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 7px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        color: cfg.color,
        background: cfg.bg,
        whiteSpace: 'nowrap',
        border: `1px solid ${cfg.color}33`,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Workload Bar ─────────────────────────────────────────────────────────────
function WorkloadBar({ memberTasks }: { memberTasks: Task[] }) {
  const total = memberTasks.length;
  if (total === 0) {
    return (
      <div
        style={{
          height: 8,
          borderRadius: 99,
          background: 'var(--c-surface-3)',
          overflow: 'hidden',
        }}
      />
    );
  }

  const statuses = ['todo', 'in_progress', 'in_review', 'blocked', 'done', 'paused', 'cancelled'];
  const segments = statuses
    .map((s) => ({ status: s, count: memberTasks.filter((t) => t.status === s).length }))
    .filter((s) => s.count > 0);

  return (
    <div
      style={{
        display: 'flex',
        height: 8,
        borderRadius: 99,
        overflow: 'hidden',
        gap: 0,
      }}
    >
      {segments.map(({ status, count }) => (
        <div
          key={status}
          title={`${STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label ?? status}: ${count}`}
          style={{
            flex: count / total,
            background: STATUS_COLORS[status] ?? '#64748B',
            minWidth: 2,
          }}
        />
      ))}
    </div>
  );
}

// ─── Member Stats helper ──────────────────────────────────────────────────────
function getMemberStats(memberId: string, tasks: Task[]) {
  const memberTasks = tasks.filter((t) => t.assignedTo?.includes(memberId));
  const total = memberTasks.length;
  const active = memberTasks.filter((t) => t.status === 'in_progress' || t.status === 'in_review').length;
  const overdue = memberTasks.filter(isOverdue).length;
  const done = memberTasks.filter((t) => t.status === 'done').length;
  const urgentTask = memberTasks.find((t) => t.status === 'in_progress' || t.status === 'blocked');
  return { memberTasks, total, active, overdue, done, urgentTask };
}

// ─── Overall Member Card ──────────────────────────────────────────────────────
function MemberCard({
  member,
  tasks,
  onSelect,
}: {
  member: TeamMember;
  tasks: Task[];
  onSelect: () => void;
}) {
  const { memberTasks, total, active, overdue, done, urgentTask } = getMemberStats(member.id, tasks);
  const [hovered, setHovered] = useState(false);

  const roleColors: Record<string, string> = {
    admin: '#8B5CF6',
    team: '#3B82F6',
    ops: '#F59E0B',
    viewer: '#64748B',
  };
  const roleColor = roleColors[member.role] ?? '#64748B';

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--c-surface)',
        border: `1px solid ${hovered ? '#2AB182' : 'var(--c-border)'}`,
        borderRadius: 16,
        padding: '20px',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 8px 24px rgba(42,177,130,0.18)'
          : '0 1px 4px rgba(0,0,0,0.08)',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar initials={member.initials} color={member.color} size={44} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: 'var(--c-text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {member.name}
          </div>
          <span
            style={{
              display: 'inline-block',
              marginTop: 3,
              padding: '1px 8px',
              borderRadius: 99,
              fontSize: 11,
              fontWeight: 600,
              color: roleColor,
              background: `${roleColor}18`,
              border: `1px solid ${roleColor}33`,
            }}
          >
            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 4,
        }}
      >
        {[
          { label: 'Total', value: total, color: 'var(--c-text)' },
          { label: 'Active', value: active, color: '#3B82F6' },
          { label: 'Overdue', value: overdue, color: '#EF4444' },
          { label: 'Done', value: done, color: '#2AB182' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '8px 4px',
              background: 'var(--c-surface-2)',
              borderRadius: 10,
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: 10, color: 'var(--c-text-3)', fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Workload Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--c-text-3)', fontWeight: 500 }}>Workload</span>
          <span style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{total} tasks</span>
        </div>
        <WorkloadBar memberTasks={memberTasks} />
      </div>

      {/* Urgent Task */}
      <div
        style={{
          borderTop: '1px solid var(--c-border)',
          paddingTop: 10,
          minHeight: 32,
        }}
      >
        {urgentTask ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: 'var(--c-text-3)', whiteSpace: 'nowrap', fontWeight: 500 }}>
              Urgent:
            </span>
            <span
              style={{
                fontSize: 12,
                color: 'var(--c-text-2)',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                flex: 1,
              }}
            >
              {urgentTask.title}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--c-text-3)' }}>No urgent tasks</span>
        )}
      </div>
    </div>
  );
}

// ─── Capacity Bar ─────────────────────────────────────────────────────────────
function CapacityInsight({ memberTasks }: { memberTasks: Task[] }) {
  const nonDone = memberTasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');
  const estimated = nonDone.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);
  const MAX = 40;
  const pct = Math.min((estimated / MAX) * 100, 100);

  let barColor = '#3B82F6';
  let label = 'Underutilized';
  let icon = '📉';
  if (estimated > MAX) {
    barColor = '#F59E0B';
    label = 'Overloaded';
    icon = '⚠️';
  } else if (estimated >= 30) {
    barColor = '#2AB182';
    label = 'Healthy';
    icon = '✅';
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: 'var(--c-surface-2)',
        borderRadius: 12,
        padding: '12px 16px',
        border: '1px solid var(--c-border)',
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--c-text-2)', fontWeight: 500 }}>
            {estimated.toFixed(0)} hrs estimated workload
          </span>
          <span style={{ fontSize: 12, color: 'var(--c-text-3)' }}>/ {MAX}h weekly</span>
        </div>
        <div
          style={{
            height: 8,
            borderRadius: 99,
            background: 'var(--c-surface-3)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: barColor,
              borderRadius: 99,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: 99,
          background: `${barColor}18`,
          border: `1px solid ${barColor}33`,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: barColor }}>{label}</span>
      </div>
    </div>
  );
}

// ─── Member Detail View ───────────────────────────────────────────────────────
function MemberDetail({
  member,
  tasks,
  onTaskClick,
}: {
  member: TeamMember;
  tasks: Task[];
  onTaskClick: (id: string) => void;
}) {
  const memberTasks = useMemo(
    () => tasks.filter((t) => t.assignedTo?.includes(member.id)),
    [tasks, member.id]
  );

  const overdue = memberTasks.filter(isOverdue).length;
  const doneThisMonth = memberTasks.filter(
    (t) => t.status === 'done' && isThisMonth(t.completedAt)
  ).length;

  const weekTasks = memberTasks.filter(
    (t) => t.status !== 'done' && t.status !== 'cancelled' && isThisWeek(t.deadline)
  );

  const statusBreakdownKeys = ['todo', 'in_progress', 'in_review', 'paused', 'blocked', 'done'];

  const sortedTasks = useMemo(() => {
    return [...memberTasks].sort((a, b) => {
      const ai = STATUS_ORDER.indexOf(a.status);
      const bi = STATUS_ORDER.indexOf(b.status);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [memberTasks]);

  const roleColors: Record<string, string> = {
    admin: '#8B5CF6',
    team: '#3B82F6',
    ops: '#F59E0B',
    viewer: '#64748B',
  };
  const roleColor = roleColors[member.role] ?? '#64748B';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Hero Header ── */}
      <div
        style={{
          background: 'var(--c-surface-2)',
          border: '1px solid var(--c-border)',
          borderRadius: 20,
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar initials={member.initials} color={member.color} size={56} />
          <div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--c-text)',
                fontFamily: "'Syne', sans-serif",
                lineHeight: 1.2,
              }}
            >
              {member.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
              <span
                style={{
                  padding: '2px 9px',
                  borderRadius: 99,
                  fontSize: 11,
                  fontWeight: 600,
                  color: roleColor,
                  background: `${roleColor}18`,
                  border: `1px solid ${roleColor}33`,
                }}
              >
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </span>
              {member.department && (
                <span style={{ fontSize: 12, color: 'var(--c-text-3)' }}>· {member.department}</span>
              )}
            </div>
          </div>
        </div>

        {/* Stat Tiles */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Total Tasks', value: memberTasks.length, color: 'var(--c-text)' },
            { label: 'Overdue', value: overdue, color: '#EF4444' },
            { label: 'Done This Month', value: doneThisMonth, color: '#2AB182' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '12px 18px',
                background: 'var(--c-surface)',
                border: '1px solid var(--c-border)',
                borderRadius: 14,
                minWidth: 90,
              }}
            >
              <span style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
              <span style={{ fontSize: 10, color: 'var(--c-text-3)', fontWeight: 500, textAlign: 'center' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Status Breakdown ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 8,
        }}
      >
        {statusBreakdownKeys.map((s) => {
          const cfg = STATUS_CONFIG[s as keyof typeof STATUS_CONFIG] ?? { label: s, color: '#94A3B8', bg: '#94A3B820' };
          const count = memberTasks.filter((t) => t.status === s).length;
          return (
            <div
              key={s}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '12px 8px',
                borderRadius: 12,
                background: `${cfg.color}1A`,
                border: `1px solid ${cfg.color}40`,
              }}
            >
              <span style={{ fontSize: 22, fontWeight: 700, color: cfg.color, lineHeight: 1 }}>{count}</span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: cfg.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  textAlign: 'center',
                }}
              >
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Capacity Insight ── */}
      <CapacityInsight memberTasks={memberTasks} />

      {/* ── This Week ── */}
      <div
        style={{
          background: 'var(--c-surface)',
          border: '1px solid var(--c-border)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--c-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>📅</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--c-text)' }}>Due This Week</span>
          {weekTasks.length > 0 && (
            <span
              style={{
                marginLeft: 'auto',
                padding: '1px 8px',
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 600,
                color: '#F59E0B',
                background: '#F59E0B18',
                border: '1px solid #F59E0B33',
              }}
            >
              {weekTasks.length}
            </span>
          )}
        </div>

        <div style={{ padding: '8px 0' }}>
          {weekTasks.length === 0 ? (
            <div
              style={{
                padding: '16px 18px',
                fontSize: 13,
                color: 'var(--c-text-3)',
                textAlign: 'center',
              }}
            >
              No deadlines this week 🎉
            </div>
          ) : (
            weekTasks.map((task) => {
              const priCfg = PRIORITY_CONFIG[task.priority] ?? { color: '#94A3B8' };
              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 18px',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'var(--c-surface-2)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: priCfg.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: 'var(--c-text)',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {task.title}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--c-text-3)', flexShrink: 0 }}>
                    {formatDeadline(task.deadline)}
                  </span>
                  <StatusChip status={task.status} />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── All Tasks Table ── */}
      <div
        style={{
          background: 'var(--c-surface)',
          border: '1px solid var(--c-border)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--c-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--c-text)' }}>All Tasks</span>
          <span
            style={{
              marginLeft: 'auto',
              padding: '1px 8px',
              borderRadius: 99,
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--c-text-3)',
              background: 'var(--c-surface-2)',
              border: '1px solid var(--c-border)',
            }}
          >
            {memberTasks.length}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
            }}
          >
            <thead>
              <tr>
                {['Priority', 'Task', 'Client', 'Status', 'Deadline'].map((col) => (
                  <th
                    key={col}
                    style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: 11,
                      color: 'var(--c-text-3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      background: 'var(--c-surface-2)',
                      borderBottom: '1px solid var(--c-border)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task, idx) => {
                const isDone = task.status === 'done';
                const client = getClientById(task.clientId);
                const overduePill = isOverdue(task);
                return (
                  <tr
                    key={task.id}
                    onClick={() => onTaskClick(task.id)}
                    style={{
                      opacity: isDone ? 0.5 : 1,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      borderBottom: idx < sortedTasks.length - 1 ? '1px solid var(--c-border)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background = 'var(--c-surface-2)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                    }}
                  >
                    {/* Priority */}
                    <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                      <PriorityBadge priority={task.priority} />
                    </td>
                    {/* Task */}
                    <td style={{ padding: '10px 16px', maxWidth: 240 }}>
                      <span
                        style={{
                          display: 'block',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          color: 'var(--c-text)',
                          textDecoration: isDone ? 'line-through' : 'none',
                          fontWeight: 500,
                        }}
                      >
                        {task.title}
                      </span>
                    </td>
                    {/* Client */}
                    <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                      {client ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 12,
                            color: 'var(--c-text-2)',
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: client.color ?? '#64748B',
                              flexShrink: 0,
                            }}
                          />
                          {client.name}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--c-text-3)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    {/* Status */}
                    <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                      <StatusChip status={task.status} />
                    </td>
                    {/* Deadline */}
                    <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: overduePill ? '#EF4444' : 'var(--c-text-3)',
                          fontWeight: overduePill ? 600 : 400,
                        }}
                      >
                        {formatDeadline(task.deadline)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {sortedTasks.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: '24px',
                      textAlign: 'center',
                      color: 'var(--c-text-3)',
                      fontSize: 13,
                    }}
                  >
                    No tasks assigned
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────
export default function TeamView({ tasks, teamMembers, onTaskClick }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('overall');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    teamMembers[0]?.id ?? ''
  );

  const selectedMember = useMemo(
    () => teamMembers.find((m) => m.id === selectedMemberId) ?? teamMembers[0],
    [teamMembers, selectedMemberId]
  );

  function handleCardClick(memberId: string) {
    setSelectedMemberId(memberId);
    setSubTab('member');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Sub-tab Pill Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--c-surface-2)',
            border: '1px solid var(--c-border)',
            borderRadius: 99,
            padding: 4,
            gap: 2,
          }}
        >
          {(['overall', 'member'] as SubTab[]).map((tab) => {
            const active = subTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setSubTab(tab)}
                style={{
                  padding: '6px 20px',
                  borderRadius: 99,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  background: active ? '#2AB182' : 'transparent',
                  color: active ? '#fff' : 'var(--c-text-2)',
                  transition: 'all 0.18s ease',
                  outline: 'none',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Member selector shown when on Member tab */}
        {subTab === 'member' && (
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 10,
              border: '1px solid var(--c-border)',
              background: 'var(--c-surface)',
              color: 'var(--c-text)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              paddingRight: 30,
            }}
          >
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}

        {/* Team count badge */}
        {subTab === 'overall' && (
          <span
            style={{
              marginLeft: 4,
              padding: '4px 10px',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--c-text-3)',
              background: 'var(--c-surface-2)',
              border: '1px solid var(--c-border)',
            }}
          >
            {teamMembers.length} members
          </span>
        )}
      </div>

      {/* ── OVERALL TAB ── */}
      {subTab === 'overall' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          {teamMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              tasks={tasks}
              onSelect={() => handleCardClick(member.id)}
            />
          ))}
          {teamMembers.length === 0 && (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '48px',
                color: 'var(--c-text-3)',
                fontSize: 14,
              }}
            >
              No team members found.
            </div>
          )}
        </div>
      )}

      {/* ── MEMBER TAB ── */}
      {subTab === 'member' && selectedMember && (
        <MemberDetail
          member={selectedMember}
          tasks={tasks}
          onTaskClick={onTaskClick}
        />
      )}

      {subTab === 'member' && !selectedMember && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px',
            color: 'var(--c-text-3)',
            fontSize: 14,
          }}
        >
          No team members available.
        </div>
      )}
    </div>
  );
}
