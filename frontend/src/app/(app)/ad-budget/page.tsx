import React from 'react';
import AdBudgetContent from '@/components/ad-budget/AdBudgetContent';

export const metadata = {
  title: 'Ad Budget & Projections | Invictus OS',
};

export default function AdBudgetPage() {
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--c-text)', margin: 0 }}>Ad Budget & Projections</h1>
        <p style={{ color: 'var(--c-text-2)', margin: '4px 0 0 0', fontSize: '14px' }}>
          Monitor client ad account balances, run rates, and upcoming recharges.
        </p>
      </div>
      <AdBudgetContent />
    </div>
  );
}
