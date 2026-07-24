'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { CalendarDays, UserCheck, UserX, Clock3, Users } from 'lucide-react';

type StatusCode = 'present' | 'late' | 'absent' | 'leave' | 'holiday' | 'half_day' | 'weekend' | 'unknown';

const STATUS_META: Record<StatusCode, { label: string; short: string; dot: string; pill: string }> = {
  present:  { label: 'Present',    short: 'P', dot: 'bg-emerald-500', pill: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
  late:     { label: 'Late',       short: 'L', dot: 'bg-amber-500',   pill: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  absent:   { label: 'Absent',     short: 'A', dot: 'bg-red-500',     pill: 'bg-red-500/15 text-red-500 border-red-500/30' },
  leave:    { label: 'On Leave',   short: 'V', dot: 'bg-blue-500',    pill: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
  holiday:  { label: 'Holiday',    short: 'H', dot: 'bg-purple-500',  pill: 'bg-purple-500/15 text-purple-500 border-purple-500/30' },
  half_day: { label: 'Half Day',   short: '½', dot: 'bg-orange-500',  pill: 'bg-orange-500/15 text-orange-500 border-orange-500/30' },
  weekend:  { label: 'Weekend',    short: 'W', dot: 'bg-text-3',      pill: 'bg-surface-3 text-text-3 border-border' },
  unknown:  { label: 'No record',  short: '–', dot: 'bg-text-3',     pill: 'bg-transparent text-text-3 border-border/50' },
};

const LEGEND_ORDER: StatusCode[] = ['present', 'late', 'absent', 'leave', 'half_day', 'holiday', 'weekend'];

export default function AttendancePage() {
  const { state, getRealUserId } = useApp();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Last 14 days, oldest first
  const days = useMemo(() => {
    const result: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      result.push(d.toISOString().split('T')[0]);
    }
    return result;
  }, []);

  // Resolve each member's real backend id once, and their status for every day in range.
  const rows = useMemo(() => {
    return state.teamMembers.map(member => {
      const realUserId = getRealUserId(member.id);
      const statusByDay: Record<string, StatusCode> = {};

      for (const day of days) {
        const daysLogs = state.attendanceLogs
          .filter(l => l.userId === member.id && l.date === day)
          .sort((a, b) => new Date(a.clockIn!).getTime() - new Date(b.clockIn!).getTime());
        const log = daysLogs[0];

        if (log && (log.status as StatusCode) in STATUS_META) {
          statusByDay[day] = log.status as StatusCode;
        } else if (day < todayStr) {
          statusByDay[day] = 'absent'; // no record for a past day defaults to absent
        } else {
          statusByDay[day] = 'unknown'; // today/future with no record yet
        }
      }

      return { member, statusByDay };
    });
  }, [state.teamMembers, state.attendanceLogs, getRealUserId, days, todayStr]);

  const todaySummary = useMemo(() => {
    let present = 0, late = 0, absent = 0, onLeave = 0;
    for (const { statusByDay } of rows) {
      const s = statusByDay[todayStr];
      if (s === 'present') present++;
      else if (s === 'late') late++;
      else if (s === 'absent') absent++;
      else if (s === 'leave') onLeave++;
    }
    return { present, late, absent, onLeave };
  }, [rows, todayStr]);

  return (
    <div className="flex flex-col h-full bg-bg text-text">
      <header className="px-8 py-6 border-b border-border flex-shrink-0 bg-surface">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays size={22} className="text-primary" />
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-syne-var)' }}>
            Team Attendance
          </h1>
        </div>
        <p className="text-text-3 text-sm">Daily clock-in status for the last 14 days</p>
      </header>

      <div className="flex-1 overflow-auto p-8 flex flex-col gap-6">
        {/* Summary stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-surface p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <UserCheck size={20} className="text-emerald-500" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-text-3 mb-0.5">Present Today</div>
              <div className="text-2xl font-bold">{todaySummary.present}</div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Clock3 size={20} className="text-amber-500" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-text-3 mb-0.5">Late Today</div>
              <div className="text-2xl font-bold">{todaySummary.late}</div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <UserX size={20} className="text-red-500" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-text-3 mb-0.5">Absent Today</div>
              <div className="text-2xl font-bold">{todaySummary.absent}</div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users size={20} className="text-primary" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-text-3 mb-0.5">Team Size</div>
              <div className="text-2xl font-bold">{state.teamMembers.length}</div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-3 mr-1">Legend</span>
          {LEGEND_ORDER.map(code => (
            <div key={code} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${STATUS_META[code].dot}`} />
              <span className="text-xs font-medium text-text-2">{STATUS_META[code].label}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="px-4 py-3 font-semibold text-text-2 sticky left-0 top-0 bg-surface-2 z-20 border-b border-r border-border min-w-[220px]">
                    Team Member
                  </th>
                  {days.map(day => {
                    const d = new Date(day);
                    const isToday = day === todayStr;
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <th
                        key={day}
                        className={`px-2 py-2 font-medium text-center sticky top-0 z-10 border-b border-border min-w-[56px] ${
                          isToday ? 'bg-primary/10' : isWeekend ? 'bg-surface-3' : 'bg-surface-2'
                        }`}
                      >
                        <div className={`text-[10px] uppercase tracking-wide ${isToday ? 'text-primary font-bold' : 'text-text-3'}`}>
                          {d.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className={`text-sm ${isToday ? 'text-primary font-bold' : 'text-text-2 font-semibold'}`}>
                          {d.getDate()}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ member, statusByDay }, rowIdx) => (
                  <tr key={member.id} className={rowIdx % 2 === 1 ? 'bg-surface-2/30' : ''}>
                    <td className="px-4 py-2.5 font-medium sticky left-0 z-10 border-r border-border bg-inherit">
                      <div className="flex items-center gap-3" style={{ backgroundColor: rowIdx % 2 === 1 ? 'var(--c-surface-2)' : 'var(--c-surface)' }}>
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ backgroundColor: member.color }}
                        >
                          {member.initials}
                        </div>
                        <span className="truncate">{member.name}</span>
                      </div>
                    </td>
                    {days.map(day => {
                      const status = statusByDay[day];
                      const meta = STATUS_META[status];
                      const isToday = day === todayStr;
                      return (
                        <td key={day} className={`px-1.5 py-2 text-center ${isToday ? 'bg-primary/5' : ''}`}>
                          <div
                            title={meta.label}
                            className={`w-8 h-8 mx-auto rounded-lg border flex items-center justify-center text-xs font-bold cursor-default ${meta.pill}`}
                          >
                            {meta.short}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
