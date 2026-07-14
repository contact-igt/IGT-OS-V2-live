'use client';

import React from 'react';
import { useApp } from '@/contexts/AppContext';

export default function LeavePage() {
  const { state } = useApp();

  return (
    <div className="flex flex-col h-full bg-bg text-text">
      <header className="px-8 py-6 border-b border-border flex justify-between items-center bg-surface sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ fontFamily: 'var(--font-syne-var)' }}>
            Leave Management
          </h1>
          <p className="text-text-3 text-sm">Balances and Team Leave Calendar</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8 space-y-8">
        
        {/* LEAVE BALANCES GRID */}
        <div>
          <h2 className="text-lg font-bold mb-4">Team Balances</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {state.teamMembers.map(member => {
              // Calculate balances from ledger
              const memberLedger = (state.leaveLedger || []).filter(l => l.userId === member.id);
              const elBalance = memberLedger.filter(l => l.leaveType === 'EL').reduce((sum, l) => sum + l.delta, 0);
              const clBalance = memberLedger.filter(l => l.leaveType === 'CL').reduce((sum, l) => sum + l.delta, 0);
              const slBalance = memberLedger.filter(l => l.leaveType === 'SL').reduce((sum, l) => sum + l.delta, 0);

              return (
                <div key={member.id} className="bg-surface rounded-xl border border-border p-5 hover:border-primary/50 transition">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white mr-3" style={{ backgroundColor: member.color }}>
                      {member.initials}
                    </div>
                    <div>
                      <div className="font-semibold text-sm truncate">{member.name}</div>
                      <div className="text-xs text-text-3">{member.title || member.roleTag?.replace('_', ' ')}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div className="bg-surface-2 rounded p-2">
                      <div className="text-xs text-text-3 mb-1">EL</div>
                      <div className="font-bold text-primary">{elBalance}</div>
                    </div>
                    <div className="bg-surface-2 rounded p-2">
                      <div className="text-xs text-text-3 mb-1">CL</div>
                      <div className="font-bold text-primary">{clBalance}</div>
                    </div>
                    <div className="bg-surface-2 rounded p-2">
                      <div className="text-xs text-text-3 mb-1">SL</div>
                      <div className="font-bold text-primary">{slBalance}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* UPCOMING LEAVE */}
        <div>
          <h2 className="text-lg font-bold mb-4">Upcoming Approved Leave</h2>
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            {state.leaveRequests.filter(r => r.status === 'approved' && new Date(r.endDate) >= new Date()).length === 0 ? (
              <div className="p-8 text-center text-text-3">No upcoming leave scheduled.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-2 border-b border-border text-text-2">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Team Member</th>
                    <th className="px-6 py-3 font-semibold">Type</th>
                    <th className="px-6 py-3 font-semibold">Duration</th>
                    <th className="px-6 py-3 font-semibold">Days</th>
                    <th className="px-6 py-3 font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {state.leaveRequests
                    .filter(r => r.status === 'approved' && new Date(r.endDate) >= new Date())
                    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                    .map(req => {
                      const member = state.teamMembers.find(m => m.id === req.userId);
                      if (!member) return null;
                      return (
                        <tr key={req.id} className="hover:bg-surface-2/50 transition">
                          <td className="px-6 py-4 font-medium flex items-center">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white mr-3 shrink-0" style={{ backgroundColor: member.color }}>
                              {member.initials}
                            </div>
                            {member.name}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-surface-3 text-text-2">
                              {req.leaveType}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-text-2">
                            {req.startDate} to {req.endDate}
                          </td>
                          <td className="px-6 py-4 font-medium">{req.days}</td>
                          <td className="px-6 py-4 text-text-3 truncate max-w-[300px]">{req.reason}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
