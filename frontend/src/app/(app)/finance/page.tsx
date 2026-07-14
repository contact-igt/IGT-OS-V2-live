import { Suspense } from 'react';
import FinanceContent from '@/components/finance/FinanceContent';

export default function FinancePage() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--c-text-2)]">Loading finance module...</div>}>
      <FinanceContent />
    </Suspense>
  );
}
