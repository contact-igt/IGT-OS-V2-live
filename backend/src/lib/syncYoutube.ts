import { Pool } from 'pg';
import { encrypt, decrypt } from './crypto';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

async function refreshAccessToken(pool: Pool, account: any): Promise<string> {
  const refreshToken = decrypt(account.encrypted_refresh_token, account.refresh_token_iv);

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json() as any;
  if (!data.access_token) throw new Error('Failed to refresh YouTube token');

  const accessTokenEnc = encrypt(data.access_token);
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await pool.query(
    `UPDATE public.social_accounts SET encrypted_access_token = $1, access_token_iv = $2, token_expires_at = $3 WHERE id = $4`,
    [accessTokenEnc.encrypted, accessTokenEnc.iv, expiresAt, account.id]
  );

  return data.access_token;
}

async function getValidAccessToken(pool: Pool, account: any): Promise<string> {
  const isExpired = !account.token_expires_at || new Date(account.token_expires_at) < new Date();
  if (isExpired) return refreshAccessToken(pool, account);
  return decrypt(account.encrypted_access_token, account.access_token_iv);
}

export async function syncYoutubeAccount(pool: Pool, account: any): Promise<void> {
  const accessToken = await getValidAccessToken(pool, account);

  // Basic channel stats (subscribers, total views) — public Data API
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${account.platform_user_id}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const channelData = await channelRes.json() as any;
  const stats = channelData.items?.[0]?.statistics;

  // Watch time + engagement over the last 28 days — Analytics API
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const analyticsRes = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?` +
    new URLSearchParams({
      ids: `channel==${account.platform_user_id}`,
      startDate,
      endDate,
      metrics: 'estimatedMinutesWatched,likes,comments,views',
    }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const analyticsData = await analyticsRes.json() as any;
  const row = analyticsData.rows?.[0] || [0, 0, 0, 0];
  const [watchMinutes, likes, comments, periodViews] = row;

  const engagementRate = periodViews > 0 ? ((likes + comments) / periodViews) * 100 : 0;

  await pool.query(
    `INSERT INTO public.social_metric_snapshots (account_id, followers, views, watch_time_hours, engagement_rate)
     VALUES ($1, $2, $3, $4, $5)`,
    [account.id, parseInt(stats?.subscriberCount || '0', 10), parseInt(stats?.viewCount || '0', 10), watchMinutes / 60, engagementRate]
  );

  // Fetch last 3 videos from YouTube Data API
  let latestPosts: any[] = [];
  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?` +
      new URLSearchParams({
        part: 'snippet',
        channelId: account.platform_user_id,
        order: 'date',
        maxResults: '3',
        type: 'video',
      }),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const searchData = await searchRes.json() as any;
    const videoItems = searchData.items || [];

    if (videoItems.length > 0) {
      const videoIds = videoItems.map((item: any) => item.id.videoId).join(',');
      const videoStatsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?` +
        new URLSearchParams({ part: 'statistics', id: videoIds }),
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const videoStatsData = await videoStatsRes.json() as any;
      const statsItems = videoStatsData.items || [];

      latestPosts = videoItems.map((item: any) => {
        const s = statsItems.find((x: any) => x.id === item.id.videoId);
        return {
          title: item.snippet.title,
          publishedAt: item.snippet.publishedAt,
          views: s ? parseInt(s.statistics.viewCount || '0', 10) : 0,
          likes: s ? parseInt(s.statistics.likeCount || '0', 10) : 0,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        };
      });
    }
  } catch (e) {
    console.error('Failed to fetch latest YouTube videos:', e);
  }

  await pool.query(
    `UPDATE public.social_accounts SET last_synced_at = now(), latest_posts = $1 WHERE id = $2`,
    [JSON.stringify(latestPosts), account.id]
  );
}
