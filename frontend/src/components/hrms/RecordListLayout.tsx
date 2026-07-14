'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface RecordListLayoutProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  searchPlaceholder?: string;
  onSearch?: (val: string) => void;
  filters?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function RecordListLayout({
  title,
  subtitle,
  actions,
  searchPlaceholder = 'Search...',
  onSearch,
  filters,
  children,
  footer
}: RecordListLayoutProps) {
  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto w-full animate-fade-in space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-syne-var)' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-[var(--c-text-2)] mt-1">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>

      {/* Toolbar: Search + Filters */}
      {(onSearch || filters) && (
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[var(--c-surface)] border border-[var(--c-border)] p-2 rounded-xl">
          {onSearch && (
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-text-3)]" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                onChange={(e) => onSearch(e.target.value)}
                className="w-full bg-transparent border-none outline-none pl-9 pr-4 py-2 text-sm placeholder:text-[var(--c-text-3)]"
              />
            </div>
          )}
          
          {filters && (
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {filters}
            </div>
          )}
        </div>
      )}

      {/* Data Area */}
      <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-2xl overflow-hidden shadow-sm">
        {children}
      </div>

      {/* Footer / Pagination */}
      {footer && (
        <div className="flex items-center justify-between text-sm text-[var(--c-text-2)]">
          {footer}
        </div>
      )}
      
    </div>
  );
}
