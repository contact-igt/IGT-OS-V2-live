'use client';

import React from 'react';
import { AdAccountBalance } from '@/lib/data';
import { useApp } from '@/contexts/AppContext';

interface Props {
  accounts: AdAccountBalance[];
  onRowClick: (account: AdAccountBalance) => void;
}

export default function AdBudgetTable({ accounts, onRowClick }: Props) {
  const { state } = useApp();

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: 'var(--c-surface-2)', borderBottom: '1px solid var(--c-border)' }}>
            <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: 'var(--c-text-2)' }}>Client</th>
            <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: 'var(--c-text-2)' }}>Account Name</th>
            <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: 'var(--c-text-2)' }}>Platform</th>
            <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: 'var(--c-text-2)' }}>Balance</th>
            <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: 'var(--c-text-2)' }}>Daily Spend</th>
            <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: 'var(--c-text-2)' }}>Days Left</th>
            <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: 'var(--c-text-2)' }}>Payer</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map(acc => {
            const client = state.clients.find(c => c.id === acc.clientId);
            const isCritical = acc.daysRemaining <= 3;
            
            return (
              <tr 
                key={acc.id}
                onClick={() => onRowClick(acc)}
                style={{ 
                  borderBottom: '1px solid var(--c-border)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  background: isCritical ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = isCritical ? 'rgba(239, 68, 68, 0.1)' : 'var(--c-surface-2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = isCritical ? 'rgba(239, 68, 68, 0.05)' : 'transparent'}
              >
                <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--c-text)', fontWeight: 500 }}>
                  {client?.name || 'Unknown'}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--c-text)' }}>
                  {acc.accountName}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--c-text)', textTransform: 'capitalize' }}>
                  {acc.platform}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--c-text)' }}>
                  ₹{acc.balanceINR.toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--c-text)' }}>
                  ₹{acc.dailySpendINR.toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                  <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600,
                    background: isCritical ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    color: isCritical ? '#EF4444' : '#10B981'
                  }}>
                    {acc.daysRemaining} days
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--c-text)', textTransform: 'capitalize' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    background: acc.payer === 'invictus' ? 'rgba(139, 92, 246, 0.1)' : 'var(--c-surface-2)',
                    color: acc.payer === 'invictus' ? '#8B5CF6' : 'var(--c-text-2)'
                  }}>
                    {acc.payer}
                  </span>
                </td>
              </tr>
            );
          })}
          {accounts.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--c-text-2)', fontSize: '14px' }}>
                No ad accounts found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
