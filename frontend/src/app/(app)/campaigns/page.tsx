import { Suspense } from 'react';
import CampaignsContent from '@/components/campaigns/CampaignsContent';

export default function CampaignsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--c-text-2)]">Loading campaigns...</div>}>
      <CampaignsContent />
    </Suspense>
  );
}
