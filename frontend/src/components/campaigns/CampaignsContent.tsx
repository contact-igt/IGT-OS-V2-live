'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import CampaignsByClient from './CampaignsByClient';
import CampaignAnalytics from './CampaignAnalytics';
import CampaignDrawer from './CampaignDrawer';

export default function CampaignsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = searchParams.get('tab') || 'by-client';
  
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const setTab = (newTab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', newTab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto min-h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--c-text)]">Campaigns</h1>
        <div className="flex bg-[var(--c-surface)] rounded-lg p-1 border border-[var(--c-border)]">
          <button
            onClick={() => setTab('by-client')}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              tab === 'by-client' ? 'bg-[var(--c-text)] text-[var(--c-bg)] shadow-sm' : 'text-[var(--c-text-2)] hover:text-[var(--c-text)]'
            }`}
          >
            By Client
          </button>
          <button
            onClick={() => setTab('analytics')}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              tab === 'analytics' ? 'bg-[var(--c-text)] text-[var(--c-bg)] shadow-sm' : 'text-[var(--c-text-2)] hover:text-[var(--c-text)]'
            }`}
          >
            Analytics
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        {tab === 'by-client' ? (
          <CampaignsByClient onOpenCampaign={setSelectedCampaignId} />
        ) : (
          <CampaignAnalytics />
        )}
      </div>

      {/* Sliding Drawer */}
      {selectedCampaignId && (
        <CampaignDrawer 
          campaignId={selectedCampaignId} 
          onClose={() => setSelectedCampaignId(null)} 
        />
      )}
    </div>
  );
}
