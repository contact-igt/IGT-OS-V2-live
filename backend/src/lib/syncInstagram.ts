import { Pool } from 'pg';
import { encrypt, decrypt } from './crypto';

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v23.0';
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

// Meta has no refresh_token grant. A long-lived token can be re-extended for another
// ~60 days at any point after it's 24h old — so instead of waiting for expiry (like
// YouTube's refresh flow), we just re-extend it opportunistically whenever it's within
// 10 days of expiring.
async function reExtendTokenIfNeeded(pool: Pool, account: any, currentToken: string): Promise<string> {
  const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  if (account.token_expires_at && new Date(account.token_expires_at) > tenDaysFromNow) {
    return currentToken; // still has plenty of runway
  }

  const res = await fetch(
    `${GRAPH_URL}/oauth/access_token?` +
    new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: process.env.META_APP_ID || '',
      client_secret: process.env.META_APP_SECRET || '',
      fb_exchange_token: currentToken,
    })
  );
  const data = await res.json() as any;

  if (!data.access_token) {
    // Can't re-extend (token may already be dead) — surface this clearly so the sync
    // loop marks the account as needing reconnection, rather than silently syncing
    // with a token that's about to die.
    throw new Error('Instagram token could not be re-extended — account needs reconnecting');
  }

  const accessTokenEnc = encrypt(data.access_token);
  const expiresAt = new Date(Date.now() + (data.expires_in || 5184000) * 1000);

  await pool.query(
    `UPDATE public.social_accounts SET encrypted_access_token = $1, access_token_iv = $2, token_expires_at = $3 WHERE id = $4`,
    [accessTokenEnc.encrypted, accessTokenEnc.iv, expiresAt, account.id]
  );

  return data.access_token;
}

export async function syncInstagramAccount(pool: Pool, account: any): Promise<void> {
  const rawToken = decrypt(account.encrypted_access_token, account.access_token_iv);
  const accessToken = await reExtendTokenIfNeeded(pool, account, rawToken);
  const igAccountId = account.platform_user_id;

  // Current follower count — a live field on the IG user object, not a time series,
  // so there's no "since/until" for this one.
  const profileRes = await fetch(`${GRAPH_URL}/${igAccountId}?fields=followers_count&access_token=${accessToken}`);
  const profileData = await profileRes.json() as any;
  const followers = profileData.followers_count ?? null;

  // Account-level reach + views over the last 28 days. "views" replaced the deprecated
  // "impressions" metric as of Graph API v22 (Apr 2025) — total content views across
  // photos/videos/reels, the IG analogue of YouTube's view count.
  const endDate = new Date();
  const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
  const since = Math.floor(startDate.getTime() / 1000);
  const until = Math.floor(endDate.getTime() / 1000);

  const insightsRes = await fetch(
    `${GRAPH_URL}/${igAccountId}/insights?` +
    new URLSearchParams({
      metric: 'reach,views',
      period: 'day',
      metric_type: 'total_value',
      since: String(since),
      until: String(until),
      access_token: accessToken,
    })
  );
  const insightsData = await insightsRes.json() as any;
  const metricValue = (name: string) =>
    insightsData.data?.find((m: any) => m.name === name)?.total_value?.value ?? null;
  const reach = metricValue('reach');
  const views = metricValue('views');

  // Engagement — the account-level "engagement" metric was deprecated, so we
  // approximate it from the last 25 posts: (likes + comments) / followers.
  let engagementRate = 0;
  let latestPosts: any[] = [];
  if (followers) {
    try {
      const mediaRes = await fetch(
        `${GRAPH_URL}/${igAccountId}/media?` +
        new URLSearchParams({
          fields: 'like_count,comments_count,permalink,timestamp,caption,media_type',
          limit: '25',
          access_token: accessToken,
        })
      );
      const mediaData = await mediaRes.json() as any;
      const posts = mediaData.data || [];
      if (posts.length > 0) {
        const totalEngagement = posts.reduce(
          (sum: number, p: any) => sum + (p.like_count || 0) + (p.comments_count || 0), 0
        );
        engagementRate = ((totalEngagement / posts.length) / followers) * 100;

        latestPosts = posts.slice(0, 3).map((p: any) => ({
          title: p.caption || 'Instagram Post',
          publishedAt: p.timestamp,
          views: p.like_count || 0,
          comments: p.comments_count || 0,
          url: p.permalink,
        }));
      }
    } catch (e) {
      console.error('Failed to fetch latest Instagram posts:', e);
    }
  }

  await pool.query(
    `INSERT INTO public.social_metric_snapshots (account_id, followers, reach, views, engagement_rate)
     VALUES ($1, $2, $3, $4, $5)`,
    [account.id, followers, reach, views, engagementRate]
  );

  await pool.query(
    `UPDATE public.social_accounts SET last_synced_at = now(), latest_posts = $1 WHERE id = $2`,
    [JSON.stringify(latestPosts), account.id]
  );
}
