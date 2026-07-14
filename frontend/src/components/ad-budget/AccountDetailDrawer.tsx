'use client';

import React, { useEffect, useState } from 'react';
import { AdAccountBalance } from '@/lib/data';
import { useApp } from '@/contexts/AppContext';
import { X, BellRing, ExternalLink, Calendar, CreditCard } from 'lucide-react';

interface Props {
  account: AdAccountBalance | null;
  onClose: () => void;
}

export default function AccountDetailDrawer({ account, onClose }: Props) {
  const { state } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (account) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [account]);

  if (!account) return null;

  const client = state.clients.find(c => c.id === account.clientId);
  const recharges = state.adRecharges?.filter(r => r.clientId === account.clientId && r.platform === account.platform) || [];
  
  const isCritical = account.daysRemaining <= 3;

  return (
    <>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.2s',
          zIndex: 40,
          backdropFilter: 'blur(2px)'
        }}
      />
      
      {/* Drawer */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '400px',
          background: 'var(--c-bg)',
          borderLeft: '1px solid var(--c-border)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ padding: '20px', borderBottom: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--c-text)', margin: 0 }}>Account Details</h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text-2)', margin: '4px 0 0 0' }}>{account.accountId}</p>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--c-text-2)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--c-surface)', border: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {account.platform === 'google' ? (
                  <span style={{ color: '#4285F4', fontWeight: 'bold' }}>G</span>
                ) : (
                  <span style={{ color: '#0668E1', fontWeight: 'bold' }}>M</span>
                )}
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--c-text)' }}>{account.accountName}</div>
                <div style={{ fontSize: '13px', color: 'var(--c-text-2)' }}>{client?.name}</div>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: 'var(--c-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--c-border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--c-text-2)', marginBottom: '4px' }}>Current Balance</div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--c-text)' }}>₹{account.balanceINR.toLocaleString('en-IN')}</div>
            </div>
            <div style={{ background: 'var(--c-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--c-border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--c-text-2)', marginBottom: '4px' }}>Daily Spend Rate</div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--c-text)' }}>₹{account.dailySpendINR.toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* Status Alert */}
          <div style={{ 
            background: isCritical ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)', 
            border: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
            padding: '16px', 
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ color: isCritical ? '#EF4444' : '#10B981', fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>
                {account.daysRemaining} Days Remaining
              </div>
              <div style={{ color: 'var(--c-text-2)', fontSize: '12px' }}>
                {isCritical ? 'Immediate recharge required to prevent ad pause.' : 'Account balance is healthy.'}
              </div>
            </div>
            {isCritical && (
              <button style={{
                background: '#EF4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <BellRing size={14} /> Reminder
              </button>
            )}
          </div>

          {/* Details */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--c-text)', marginBottom: '12px' }}>Configuration</h3>
            <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--c-border)' }}>
                <span style={{ color: 'var(--c-text-2)', fontSize: '13px' }}>Allocated Budget</span>
                <span style={{ color: 'var(--c-text)', fontSize: '13px', fontWeight: 500 }}>₹{account.allocatedINR.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--c-border)' }}>
                <span style={{ color: 'var(--c-text-2)', fontSize: '13px' }}>Payer</span>
                <span style={{ color: 'var(--c-text)', fontSize: '13px', fontWeight: 500, textTransform: 'capitalize' }}>{account.payer}</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--c-text-2)', fontSize: '13px' }}>Last Synced</span>
                <span style={{ color: 'var(--c-text)', fontSize: '13px', fontWeight: 500 }}>
                  {new Date(account.lastSynced).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            </div>
          </div>

          {/* Recharge History */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--c-text)', marginBottom: '12px' }}>Recharge History</h3>
            {recharges.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recharges.map(r => (
                  <div key={r.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    background: 'var(--c-surface)',
                    border: '1px solid var(--c-border)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '32px', height: '32px', borderRadius: '50%', 
                        background: 'rgba(16, 185, 129, 0.1)', color: '#10B981',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <CreditCard size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-text)' }}>₹{r.amountINR.toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '12px', color: 'var(--c-text-2)' }}>{new Date(r.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--c-text-2)', textTransform: 'capitalize', textAlign: 'right' }}>
                      <div>{r.recharger}</div>
                      <div>{r.method}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '12px' }}>
                <Calendar size={24} style={{ color: 'var(--c-text-2)', margin: '0 auto 8px', display: 'block' }} />
                <div style={{ fontSize: '13px', color: 'var(--c-text-2)' }}>No recharge history found</div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </>
  );
}
