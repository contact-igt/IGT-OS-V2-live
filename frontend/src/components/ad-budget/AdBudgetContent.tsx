'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import AdBudgetTable from './AdBudgetTable';
import AccountDetailDrawer from './AccountDetailDrawer';
import { AdAccountBalance } from '@/lib/data';

export default function AdBudgetContent() {
  const { state } = useApp();
  const [selectedAccount, setSelectedAccount] = useState<AdAccountBalance | null>(null);

  // Derived data
  const accounts = state.adAccountBalances || [];
  
  // Sort accounts by days remaining
  const sortedAccounts = [...accounts].sort((a, b) => a.daysRemaining - b.daysRemaining);

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          background: 'var(--c-surface)', 
          border: '1px solid var(--c-border)', 
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <AdBudgetTable 
            accounts={sortedAccounts} 
            onRowClick={setSelectedAccount} 
          />
        </div>
      </div>

      <div style={{ 
        width: '320px', 
        background: 'var(--c-surface)', 
        border: '1px solid var(--c-border)', 
        borderRadius: '12px',
        padding: '20px',
        flexShrink: 0
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: 'var(--c-text)' }}>
          Recent Recharges
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(state.adRecharges || []).slice(0, 5).map(recharge => {
            const client = state.clients.find(c => c.id === recharge.clientId);
            return (
              <div key={recharge.id} style={{
                background: 'var(--c-surface-2)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--c-border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 500, fontSize: '14px', color: 'var(--c-text)' }}>{client?.name || 'Unknown Client'}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#10B981' }}>
                    ₹{recharge.amountINR.toLocaleString('en-IN')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--c-text-2)' }}>
                  <span style={{ textTransform: 'capitalize' }}>{recharge.platform}</span>
                  <span>{new Date(recharge.date).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
          {(!state.adRecharges || state.adRecharges.length === 0) && (
            <p style={{ fontSize: '13px', color: 'var(--c-text-2)', textAlign: 'center' }}>No recent recharges.</p>
          )}
        </div>
      </div>

      <AccountDetailDrawer 
        account={selectedAccount} 
        onClose={() => setSelectedAccount(null)} 
      />
    </div>
  );
}
