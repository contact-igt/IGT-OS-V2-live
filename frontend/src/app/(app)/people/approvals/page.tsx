'use client';

import React from 'react';
import { useApp } from '@/contexts/AppContext';

export default function ApprovalsPage() {
  const { state, decideApproval } = useApp();

  const pendingApprovals = state.approvals.filter(a => a.status === 'pending');
  const pastApprovals = state.approvals.filter(a => a.status !== 'pending').sort((a, b) => new Date(b.decidedAt!).getTime() - new Date(a.decidedAt!).getTime());

  const renderApprovalCard = (approval: typeof state.approvals[0]) => {
    const requester = state.teamMembers.find(m => m.id === approval.requestedBy);
    const approver = state.teamMembers.find(m => m.id === approval.approverId);
    if (!requester) return null;

    let content = null;
    if (approval.kind === 'leave') {
      const { leaveType, startDate, endDate, days } = approval.contextJson;
      content = (
        <div>
          <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-blue-500/10 text-blue-500 mb-2">Leave Request</span>
          <p className="text-sm font-medium mb-1">Requests {days} days of {leaveType}</p>
          <p className="text-xs text-text-3">{startDate} to {endDate}</p>
        </div>
      );
    } else if (approval.kind === 'task_review') {
      const task = state.tasks.find(t => t.id === approval.refId);
      content = (
        <div>
          <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-amber-500/10 text-amber-500 mb-2">Task Review</span>
          <p className="text-sm font-medium mb-1 truncate">{task?.title || 'Unknown Task'}</p>
          <p className="text-xs text-text-3">Submitted for final review</p>
        </div>
      );
    } else {
      content = (
        <div>
          <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-surface-3 text-text-2 mb-2">{approval.kind}</span>
          <p className="text-sm">Action required</p>
        </div>
      );
    }

    return (
      <div key={approval.id} className={`bg-surface rounded-xl border p-5 ${approval.status === 'pending' ? 'border-border hover:border-primary/50' : 'border-surface-2 opacity-70'} transition`}>
        <div className="flex items-center mb-4 pb-4 border-b border-border">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3 shrink-0" style={{ backgroundColor: requester.color }}>
            {requester.initials}
          </div>
          <div>
            <div className="font-semibold text-sm">{requester.name}</div>
            <div className="text-xs text-text-3">{approval.createdAt ? new Date(approval.createdAt).toLocaleDateString() : '—'}</div>
          </div>
        </div>
        
        <div className="mb-6">
          {content}
        </div>

        {approval.status === 'pending' ? (
          <div className="flex gap-2 mt-auto">
            <button 
              onClick={() => decideApproval(approval.id, 'approved', 'Approved from inbox')}
              className="flex-1 bg-primary text-bg font-bold text-sm py-2 rounded hover:bg-primary/90 transition"
            >
              Approve
            </button>
            <button 
              onClick={() => decideApproval(approval.id, 'rejected', 'Rejected from inbox')}
              className="flex-1 bg-surface-2 text-text font-bold text-sm py-2 rounded hover:bg-surface-3 transition"
            >
              Reject
            </button>
          </div>
        ) : (
          <div className="mt-auto">
            <div className={`text-xs font-bold px-2 py-1.5 rounded inline-block ${approval.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              {approval.status.toUpperCase()} by {approver?.name || 'Unknown'}
            </div>
            {approval.decisionNote && <p className="text-xs text-text-3 mt-2">Note: {approval.decisionNote}</p>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-bg text-text">
      <header className="px-8 py-6 border-b border-border flex justify-between items-center bg-surface sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ fontFamily: 'var(--font-syne-var)' }}>
            Unified Approvals
          </h1>
          <p className="text-text-3 text-sm">Inbox zero for managers</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8 space-y-12">
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center">
            Pending Actions
            <span className="ml-3 bg-amber-500 text-bg text-xs font-bold px-2 py-0.5 rounded-full">{pendingApprovals.length}</span>
          </h2>
          {pendingApprovals.length === 0 ? (
            <div className="p-8 text-center text-text-3 border border-dashed border-border rounded-xl">You're all caught up!</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pendingApprovals.map(renderApprovalCard)}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-bold mb-4 text-text-2">Recent Decisions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pastApprovals.slice(0, 10).map(renderApprovalCard)}
          </div>
        </div>
      </div>
    </div>
  );
}
