import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth, requireRole } from '../middleware/auth';

// Derived integration registry: status comes from REAL configuration + connected-account state. Never returns
// tokens, emails or secret values (env vars are reported only as present/absent).
const router = Router();

export type IntegrationStatus = 'NOT_CONFIGURED' | 'ACCESS_REQUIRED' | 'HEALTHY' | 'DEGRADED' | 'ERROR';
const STALE_SYNC_HOURS = 36;     // thresholds are policy: kept in one place
const EXPIRY_WARN_DAYS = 3;

interface AccountState { label: string; client: string | null; tokenExpiresAt: string | null; lastSyncedAt: string | null; health: IntegrationStatus; reason: string | null }

export function assessAccount(a: { token_expires_at: Date | null; last_synced_at: Date | null }, now = new Date()): { health: IntegrationStatus; reason: string | null } {
  if (a.token_expires_at && a.token_expires_at.getTime() < now.getTime()) return { health: 'ERROR', reason: 'access token expired - reconnect required' };
  if (!a.last_synced_at) return { health: 'DEGRADED', reason: 'never synced' };
  const hours = (now.getTime() - a.last_synced_at.getTime()) / 3_600_000;
  if (hours > STALE_SYNC_HOURS) return { health: 'DEGRADED', reason: `last successful sync ${Math.round(hours)}h ago` };
  if (a.token_expires_at && (a.token_expires_at.getTime() - now.getTime()) / 86_400_000 < EXPIRY_WARN_DAYS) return { health: 'DEGRADED', reason: 'access token expires soon' };
  return { health: 'HEALTHY', reason: null };
}
const worst = (hs: IntegrationStatus[]): IntegrationStatus => (['ERROR', 'DEGRADED', 'HEALTHY'] as IntegrationStatus[]).find(h => hs.includes(h)) || 'ACCESS_REQUIRED';
const has = (...names: string[]) => names.every(n => !!process.env[n]);

router.get('/', requireAuth, requireRole('admin', 'ops'), async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  try {
    const now = new Date();
    const social = await pool.query(
      `SELECT s.platform, s.account_label, s.token_expires_at, s.last_synced_at, c.name AS client_name
       FROM public.social_accounts s LEFT JOIN public.clients c ON c.id = s.client_id ORDER BY s.platform, s.account_label LIMIT 200`);
    const google = await pool.query('SELECT count(*)::int AS n, max(token_expires_at) AS exp FROM public.google_accounts');
    const gh = await pool.query(`SELECT count(*)::int AS n FROM public.github_installations WHERE is_active`);
    const lastCommit = await pool.query('SELECT max(committed_at) AS t FROM public.github_commits').catch(() => ({ rows: [{ t: null }] }));

    const accountsFor = (platform: string): AccountState[] => social.rows.filter(r => r.platform === platform).map(r => {
      const a = assessAccount(r, now);
      return { label: r.account_label, client: r.client_name, tokenExpiresAt: r.token_expires_at, lastSyncedAt: r.last_synced_at, health: a.health, reason: a.reason };
    });

    const oauthProvider = (key: string, label: string, envNames: string[], platform: string, scopes: string[]) => {
      const configured = has(...envNames);
      const accounts = accountsFor(platform);
      const status: IntegrationStatus = !configured ? 'NOT_CONFIGURED' : accounts.length === 0 ? 'ACCESS_REQUIRED' : worst(accounts.map(a => a.health));
      return { key, label, adapter: 'built', status, configured, missingConfig: configured ? [] : envNames.filter(n => !process.env[n]), requestedScopes: scopes,
        accounts, lastSuccessfulSync: accounts.map(a => a.lastSyncedAt).filter(Boolean).sort().pop() || null, dataClass: status === 'HEALTHY' ? 'LIVE API' : 'UNKNOWN' };
    };
    const notBuilt = (key: string, label: string, note: string) => ({ key, label, adapter: 'not_built', status: 'ACCESS_REQUIRED' as IntegrationStatus, configured: false, missingConfig: ['API credentials / platform approval'],
      requestedScopes: [], accounts: [] as AccountState[], lastSuccessfulSync: null, dataClass: 'UNKNOWN', note });

    const gConfigured = has('GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET');
    const gExp: Date | null = google.rows[0].exp;
    const googleStatus: IntegrationStatus = !gConfigured ? 'NOT_CONFIGURED' : google.rows[0].n === 0 ? 'ACCESS_REQUIRED' : gExp && gExp.getTime() < now.getTime() ? 'DEGRADED' : 'HEALTHY';
    const ghConfigured = has('GITHUB_APP_ID', 'GITHUB_INSTALLATION_ID', 'GITHUB_PRIVATE_KEY');

    res.json({
      generatedAt: now.toISOString(),
      thresholds: { staleSyncHours: STALE_SYNC_HOURS, tokenExpiryWarnDays: EXPIRY_WARN_DAYS },
      providers: [
        notBuilt('meta_ads', 'Meta Ads (Marketing API)', 'Adapter not built; needs Meta Marketing API access + client ad-account approval.'),
        notBuilt('google_ads', 'Google Ads', 'Adapter not built; needs Google Ads API developer token + client account linking.'),
        notBuilt('google_analytics', 'Google Analytics 4', 'Adapter not built; needs GA4 Data API access per client property.'),
        notBuilt('google_business_profile', 'Google Business Profile', 'Adapter not built; needs Business Profile API approval.'),
        oauthProvider('instagram', 'Instagram / Facebook Pages', ['META_APP_ID', 'META_APP_SECRET'], 'instagram', ['pages_show_list', 'pages_read_engagement', 'instagram_basic', 'instagram_manage_insights']),
        oauthProvider('youtube', 'YouTube', ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'], 'youtube', ['youtube.readonly']),
        { key: 'google_workspace', label: 'Google Calendar + Gmail (per employee)', adapter: 'built', status: googleStatus, configured: gConfigured, missingConfig: gConfigured ? [] : ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
          requestedScopes: ['calendar.readonly', 'gmail.readonly'], accounts: [], connectedUsers: google.rows[0].n, lastSuccessfulSync: null, dataClass: googleStatus === 'HEALTHY' ? 'LIVE API' : 'UNKNOWN' },
        { key: 'github', label: 'GitHub App', adapter: 'built', status: (!ghConfigured ? 'NOT_CONFIGURED' : gh.rows[0].n === 0 ? 'ACCESS_REQUIRED' : 'HEALTHY') as IntegrationStatus, configured: ghConfigured,
          missingConfig: ghConfigured ? [] : ['GITHUB_APP_ID', 'GITHUB_INSTALLATION_ID', 'GITHUB_PRIVATE_KEY'].filter(n => !process.env[n]), requestedScopes: ['contents:read', 'pull_requests:read'], accounts: [],
          lastSuccessfulSync: lastCommit.rows[0].t || null, dataClass: ghConfigured && gh.rows[0].n > 0 ? 'LIVE API' : 'UNKNOWN' },
      ],
    });
  } catch (e) {
    console.error('integrations registry error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
