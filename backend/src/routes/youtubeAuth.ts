import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { encrypt } from '../lib/crypto';

const router = Router();

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

function redirectUri(): string {
  return `${process.env.BACKEND_URL}/api/auth/youtube/callback`;
}

// Step 1: kick off the OAuth flow
router.get('/connect', (req: Request, res: Response) => {
  const { clientId, label } = req.query;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri(),
    response_type: 'code',
    access_type: 'offline', // required to get a refresh token
    // "consent" re-issues a refresh token on repeat connects; "select_account" forces
    // Google's account picker instead of silently reusing whichever Google account is
    // already logged in — needed to connect a second channel belonging to a different
    // Google account.
    prompt: 'consent select_account',
    scope: [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/yt-analytics.readonly',
    ].join(' '),
    state: JSON.stringify({ clientId: clientId || null, label: label || '' }),
  });

  res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
});

// Step 2: handle Google's redirect back with the auth code
router.get('/callback', async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  let parsedState: any = {};
  try {
    parsedState = JSON.parse((state as string) || '{}');
  } catch (e) {}

  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri(),
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json() as any;

    if (!tokenData.access_token) {
      console.error('Token exchange failed:', tokenData);
      return res.status(500).send('Failed to exchange authorization code');
    }

    // Fetch the channel this token belongs to
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const channelData = await channelRes.json() as any;
    const channel = channelData.items?.[0];

    if (!channel) {
      return res.status(500).send('Could not fetch channel info');
    }

    const accessTokenEnc = encrypt(tokenData.access_token);
    const refreshTokenEnc = tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null;
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    await pool.query(
      `INSERT INTO public.social_accounts (client_id, platform, account_label, platform_user_id, encrypted_access_token, access_token_iv, encrypted_refresh_token, refresh_token_iv, token_expires_at)
       VALUES ($1, 'youtube', $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (platform_user_id) DO UPDATE SET
         client_id = EXCLUDED.client_id, encrypted_access_token = EXCLUDED.encrypted_access_token,
         access_token_iv = EXCLUDED.access_token_iv,
         encrypted_refresh_token = COALESCE(EXCLUDED.encrypted_refresh_token, public.social_accounts.encrypted_refresh_token),
         refresh_token_iv = COALESCE(EXCLUDED.refresh_token_iv, public.social_accounts.refresh_token_iv),
         token_expires_at = EXCLUDED.token_expires_at`,
      [
        parsedState.clientId || null,
        parsedState.label || channel.snippet.title,
        channel.id,
        accessTokenEnc.encrypted,
        accessTokenEnc.iv,
        refreshTokenEnc?.encrypted || null,
        refreshTokenEnc?.iv || null,
        expiresAt,
      ]
    );

    res.redirect(`${process.env.FRONTEND_URL}/social?connected=youtube`);
  } catch (err) {
    console.error('YouTube OAuth callback error:', err);
    res.status(500).send('Something went wrong connecting your YouTube account');
  }
});

export default router;
