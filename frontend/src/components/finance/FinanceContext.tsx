'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface FinanceContextType {
  financeVisible: boolean;
  toggleFinance: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [financeVisible, setFinanceVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('finance_visible');
    if (stored === 'true') setFinanceVisible(true);
  }, []);

  const toggleFinance = () => {
    const next = !financeVisible;
    setFinanceVisible(next);
    localStorage.setItem('finance_visible', String(next));
  };

  return (
    <FinanceContext.Provider value={{ financeVisible, toggleFinance }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within FinanceProvider');
  return context;
}

export function FinanceValue({ amount, prefix = '₹', suffix = '' }: { amount: number | undefined, prefix?: string, suffix?: string }) {
  const { financeVisible } = useFinance();
  const safeAmount = amount || 0;
  return (
    <span className={`transition-all ${financeVisible ? '' : 'blur-md select-none opacity-60'}`}>
      {financeVisible ? `${prefix}${safeAmount.toLocaleString('en-IN')}${suffix}` : '••••••'}
    </span>
  );
}
