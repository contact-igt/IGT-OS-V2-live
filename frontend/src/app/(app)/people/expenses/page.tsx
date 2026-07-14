"use client";

import React, { useState } from 'react';
import RecordListLayout from '@/components/hrms/RecordListLayout';
import { useApp } from '@/contexts/AppContext';

export default function ExpensesPage() {
  const { state } = useApp();
  const [isNewClaimModalOpen, setIsNewClaimModalOpen] = useState(false);
  const [newClaim, setNewClaim] = useState({
    employee: '',
    date: '',
    category: '',
    amount: '',
    status: 'Pending'
  });

  // Example default if state.expenseClaims is undefined
  const expenses = state.expenseClaims || [];

  const columns = ['Employee', 'Date', 'Category', 'Amount', 'Status'];

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-500/10 text-green-500';
      case 'pending':
        return 'bg-amber-500/10 text-amber-500';
      case 'rejected':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-slate-500/10 text-slate-500';
    }
  };

  const handleCreateClaim = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would dispatch an action or API call
    console.log('Creating claim', newClaim);
    setIsNewClaimModalOpen(false);
    setNewClaim({
      employee: '',
      date: '',
      category: '',
      amount: '',
      status: 'Pending'
    });
  };

  return (
    <div className="h-full w-full">
      <RecordListLayout
        title="Expense Claims"
        subtitle="Manage and track employee expense claims"
        actions={
          <button
            onClick={() => setIsNewClaimModalOpen(true)}
            className="px-4 py-2 bg-[#2AB182] text-white text-sm font-medium rounded-lg hover:bg-[#2AB182]/90 transition-colors"
          >
            New Claim
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                {columns.map((col) => (
                  <th key={col} className="p-4 text-sm font-medium text-white/60">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-4 text-center text-white/40">
                    No expense claims found.
                  </td>
                </tr>
              ) : (
                expenses.map((expense: any, idx: number) => (
                  <tr key={expense.id || idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-sm text-white/90">{expense.employee}</td>
                    <td className="p-4 text-sm text-white/90">{expense.date}</td>
                    <td className="p-4 text-sm text-white/90">{expense.category}</td>
                    <td className="p-4 text-sm text-white/90">
                      ₹{Number(expense.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(expense.status)}`}>
                        {expense.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </RecordListLayout>

      {/* Inline Modal for New Claim */}
      {isNewClaimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#111111] border border-white/10 rounded-xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-white">New Expense Claim</h3>
              <button 
                onClick={() => setIsNewClaimModalOpen(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateClaim} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Employee</label>
                <input
                  type="text"
                  required
                  value={newClaim.employee}
                  onChange={(e) => setNewClaim({...newClaim, employee: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
                  placeholder="Enter employee name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={newClaim.date}
                  onChange={(e) => setNewClaim({...newClaim, date: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Category</label>
                <select
                  required
                  value={newClaim.category}
                  onChange={(e) => setNewClaim({...newClaim, category: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all appearance-none"
                >
                  <option value="" className="bg-[#111111]">Select category</option>
                  <option value="Travel" className="bg-[#111111]">Travel</option>
                  <option value="Meals" className="bg-[#111111]">Meals</option>
                  <option value="Office Supplies" className="bg-[#111111]">Office Supplies</option>
                  <option value="Training" className="bg-[#111111]">Training</option>
                  <option value="Other" className="bg-[#111111]">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={newClaim.amount}
                  onChange={(e) => setNewClaim({...newClaim, amount: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
                  placeholder="0.00"
                />
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewClaimModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
                >
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
