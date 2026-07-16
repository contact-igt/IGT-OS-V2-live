import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../middleware/auth';
import { syncYoutubeAccount } from '../lib/syncYoutube';
import { syncInstagramAccount } from '../lib/syncInstagram';

const router = Router();

const SYNC_HANDLERS: Record<string, (pool: Pool, account: any) => Promise<void>> = {
  youtube: syncYoutubeAccount,
  instagram: syncInstagramAccount,
};

router.post('/sync', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const accountsResult = await pool.query('SELECT * FROM public.social_accounts');

    // Run syncs in parallel to handle scaling (e.g. 17+ accounts) without timing out
    const results = await Promise.all(
      accountsResult.rows.map(async (account: any) => {
        const syncFn = SYNC_HANDLERS[account.platform];
        if (!syncFn) {
          console.error(`No sync handler for platform "${account.platform}"`);
          return { account: account.account_label, status: 'skipped' };
        }
        try {
          await syncFn(pool, account);
          return { account: account.account_label, status: 'success' };
        } catch (err) {
          console.error(`Sync failed for ${account.account_label}:`, err);
          return { account: account.account_label, status: 'failed' };
        }
      })
    );

    res.status(200).json({ synced: results });
  } catch (err) {
    console.error('Sync-all error:', err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

router.get('/accounts', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const accountsResult = await pool.query('SELECT * FROM public.social_accounts');

    const shaped = await Promise.all(accountsResult.rows.map(async (acc: any) => {
      const snapshotsResult = await pool.query(
        'SELECT * FROM public.social_metric_snapshots WHERE account_id = $1 ORDER BY synced_at DESC',
        [acc.id]
      );
      const snapshots = snapshotsResult.rows;
      const latest = snapshots[0];

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const historical = snapshots.find((s: any) => new Date(s.synced_at) <= thirtyDaysAgo) || snapshots[snapshots.length - 1];

      const pctChange = (curr: number, prev: number) =>
        prev ? (((curr - prev) / prev) * 100).toFixed(1) : null;

      // Only show growth if snapshot history spans at least 1 day, to prevent
      // misleading metrics from a single sync.
      const isHistoricalValid = historical && latest &&
        (new Date(latest.synced_at).getTime() - new Date(historical.synced_at).getTime() > 24 * 60 * 60 * 1000);
      const followersChange = isHistoricalValid ? pctChange(latest.followers, historical.followers) : null;
      const reachChange = isHistoricalValid ? pctChange(latest.reach, historical.reach) : null;
      const viewsChange = isHistoricalValid ? pctChange(latest.views, historical.views) : null;
      const followersGrowth30d = isHistoricalValid ? (latest.followers ?? 0) - (historical.followers ?? 0) : null;

      // Delta against the immediately-prior sync (not a fixed "yesterday" — syncs are
      // triggered manually, so this is however long ago that was).
      const previous = snapshots[1] || null;
      const sinceLastSync = previous ? {
        followers: (latest.followers ?? 0) - (previous.followers ?? 0),
        reachPct: pctChange(latest.reach, previous.reach),
        viewsPct: pctChange(latest.views, previous.views),
        engagementRateDelta: (latest.engagement_rate != null && previous.engagement_rate != null)
          ? (latest.engagement_rate - previous.engagement_rate).toFixed(2)
          : null,
      } : null;

      return {
        id: acc.id,
        clientId: acc.client_id,
        platform: acc.platform,
        label: acc.account_label,
        lastSyncedAt: acc.last_synced_at,
        lastUpdated: acc.last_synced_at,
        followers: latest?.followers ?? null,
        followersChange,
        followersGrowth30d,
        reach: latest?.reach ?? null,
        reachChange,
        views: latest?.views ?? null,
        viewsChange,
        watchTimeHours: latest?.watch_time_hours ?? null,
        engagementRate: latest?.engagement_rate ?? null,
        sinceLastSync,
        latestPosts: acc.latest_posts || [],
      };
    }));

    res.status(200).json({ accounts: shaped });
  } catch (err) {
    console.error('Error fetching social accounts:', err);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

router.patch('/accounts/:id', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const { id } = req.params;
  const { clientId, label } = req.body;
  try {
    const result = await pool.query(
      `UPDATE public.social_accounts SET client_id = $1, account_label = COALESCE($2, account_label) WHERE id = $3 RETURNING *`,
      [clientId || null, label || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Account not found' });
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to update social account:', err);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

export default router;
