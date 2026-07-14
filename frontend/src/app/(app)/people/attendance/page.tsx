'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';

export default function AttendancePage() {
  const { state } = useApp();

  // Generate last 14 days
  const days = useMemo(() => {
    const result = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      result.push(d.toISOString().split('T')[0]);
    }
    return result;
  }, []);

  return (
    <div className="flex flex-col h-full bg-bg text-text">
      <header className="px-8 py-6 border-b border-border flex justify-between items-center bg-surface sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ fontFamily: 'var(--font-syne-var)' }}>
            Team Attendance
          </h1>
          <p className="text-text-3 text-sm">Last 14 days grid view</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-semibold text-text-2 sticky left-0 bg-surface-2 z-10 border-r border-border min-w-[200px]">Team Member</th>
                  {days.map(day => (
                    <th key={day} className="px-3 py-3 font-medium text-text-3 text-center min-w-[60px]">
                      {new Date(day).getDate()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {state.teamMembers.map(member => (
                  <tr key={member.id} className="hover:bg-surface-2/50 transition">
                    <td className="px-4 py-3 font-medium flex items-center sticky left-0 bg-surface z-10 border-r border-border group-hover:bg-surface-2/50 transition">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white mr-3 shrink-0" style={{ backgroundColor: member.color }}>
                        {member.initials}
                      </div>
                      <span className="truncate">{member.name}</span>
                    </td>
                    {days.map(day => {
                      const log = state.attendanceLogs.find(l => l.userId === member.id && l.date === day);
                      let bgColor = '';
                      let label = '-';
                      if (log) {
                        switch (log.status) {
                          case 'present': bgColor = 'bg-emerald-500/20 text-emerald-500'; label = 'P'; break;
                          case 'late': bgColor = 'bg-amber-500/20 text-amber-500'; label = 'L'; break;
                          case 'absent': bgColor = 'bg-red-500/20 text-red-500'; label = 'A'; break;
                          case 'leave': bgColor = 'bg-blue-500/20 text-blue-500'; label = 'V'; break;
                          case 'holiday': bgColor = 'bg-purple-500/20 text-purple-500'; label = 'H'; break;
                          case 'half_day': bgColor = 'bg-orange-500/20 text-orange-500'; label = '½'; break;
                          case 'weekend': bgColor = 'bg-surface-3 text-text-3'; label = 'W'; break;
                        }
                      } else if (new Date(day) < new Date(new Date().toISOString().split('T')[0])) {
                         bgColor = 'bg-red-500/20 text-red-500'; label = 'A'; // Absent by default if past
                      }

                      return (
                        <td key={day} className="px-2 py-3 text-center">
                          <div className={`w-8 h-8 rounded mx-auto flex items-center justify-center text-xs font-bold ${bgColor}`}>
                            {label}
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
