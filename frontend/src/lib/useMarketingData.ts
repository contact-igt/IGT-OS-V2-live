'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface DbCampaign {
  id: string; client_id: string; campaign_name: string; campaign_type: string; status: string;
  budget_inr: number | null; spend_inr: number | null; impressions: number | null; clicks: number | null;
  leads: number | null; conversions: number | null; cpl_inr: number | null; start_date: string | null; end_date: string | null;
}
export interface DbBalance { id: string; clientId: string; platform: string | null; balance: string | number | null; daysRemaining: number | null; updated_at: string | null }

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Real campaign rows + ad-account balances from the database. A failed request is reported as an error,
// never as an empty/zero result.
export function useMarketingData() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<DbCampaign[]>([]);
  const [balances, setBalances] = useState<DbBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canSeeBalances = !!user && ['admin', 'ops', 'super_admin'].includes(user.role);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const opts: RequestInit = { credentials: 'include' };
        const [c, b] = await Promise.all([
          fetch(`${baseUrl}/api/campaigns`, opts),
          canSeeBalances ? fetch(`${baseUrl}/api/analytics/ad-balances`, opts) : Promise.resolve(null),
        ]);
        if (!c.ok) throw new Error(`Campaigns request failed (${c.status})`);
        if (b && !b.ok) throw new Error(`Ad balances request failed (${b.status})`);
        const [cj, bj] = await Promise.all([c.json(), b ? b.json() : Promise.resolve([])]);
        if (!cancelled) { setCampaigns(cj); setBalances(bj); }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Could not load marketing data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, canSeeBalances]);

  return { campaigns, balances, loading, error, canSeeBalances };
}
