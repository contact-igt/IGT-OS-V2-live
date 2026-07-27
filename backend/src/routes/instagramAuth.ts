import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { encrypt } from '../lib/crypto';
import { buildRedirectUri } from '../lib/oauthRedirect';

const router = Router();

// Bump this in one place when Meta ships a new version — check
// developers.facebook.com/docs/graph-api/changelog before bumping.
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v23.0';
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;
const FB_OAUTH_DIALOG_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;

function redirectUri(): string {
  return buildRedirectUri('/api/auth/instagram/callback');
}

// Step 1: kick off the OAuth flow
router.get('/connect', (req: Request, res: Response) => {
  const { clientId, label } = req.query; // e.g. ?clientId=abc123&label=Phoenix%20Fitness

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID || '',
    redirect_uri: redirectUri(),
    response_type: 'code',
    // Without this, Facebook silently reuses whatever Pages/assets were granted on a
    // prior login instead of showing the picker again — so connecting a second/third
    // Instagram account would just re-grant the first one. This forces the
    // asset-selection dialog every time.
    auth_type: 'rerequest',
    scope: [
      'pages_show_list',
      'pages_read_engagement',
      'instagram_basic',
      'instagram_manage_insights',
      'business_management',
    ].join(','),
    state: JSON.stringify({ clientId: clientId || null, label: label || '' }),
  });

  res.redirect(`${FB_OAUTH_DIALOG_URL}?${params.toString()}`);
});

// Step 2: handle Meta's redirect back with the auth code
router.get('/callback', async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  const { code, error, state } = req.query;

  if (error) {
    console.error('Instagram OAuth error:', req.query);
    return res.redirect(`${process.env.FRONTEND_URL}/social?error=instagram_denied`);
  }
  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  let parsedState: any = {};
  try {
    parsedState = JSON.parse((state as string) || '{}');
  } catch (e) {}

  try {
    // Exchange code for a short-lived user access token
    const shortTokenRes = await fetch(
      `${GRAPH_URL}/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env.META_APP_ID || '',
        client_secret: process.env.META_APP_SECRET || '',
        redirect_uri: redirectUri(),
        code: code as string,
      })
    );
    const shortTokenData = await shortTokenRes.json() as any;

    if (!shortTokenData.access_token) {
      console.error('Instagram token exchange failed:', shortTokenData);
      return res.status(500).send('Failed to exchange authorization code');
    }

    // Exchange for a long-lived user token (~60 days). Unlike Google, Meta has no
    // refresh_token grant — the sync job re-extends this token rather than swapping
    // it for a new one.
    const longTokenRes = await fetch(
      `${GRAPH_URL}/oauth/access_token?` +
      new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID || '',
        client_secret: process.env.META_APP_SECRET || '',
        fb_exchange_token: shortTokenData.access_token,
      })
    );
    const longTokenData = await longTokenRes.json() as any;

    if (!longTokenData.access_token) {
      console.error('Instagram long-lived token exchange failed:', longTokenData);
      return res.status(500).send('Failed to get a long-lived access token');
    }
    const userAccessToken = longTokenData.access_token;
    const expiresAt = new Date(Date.now() + (longTokenData.expires_in || 5184000) * 1000);

    // Get every Facebook Page this user manages, with its own page access token
    const pagesRes = await fetch(
      `${GRAPH_URL}/me/accounts?fields=id,name,access_token&access_token=${userAccessToken}`
    );
    const pagesData = await pagesRes.json() as any;
    const pages = pagesData.data || [];

    if (pages.length === 0) {
      return res.redirect(`${process.env.FRONTEND_URL}/social?error=instagram_no_pages`);
    }

    // For each Page, check whether it has a linked Instagram Business Account and
    // connect it. If the person manages several client Pages, this connects all of
    // them in one pass.
    let connectedCount = 0;
    for (const page of pages) {
      const igLinkRes = await fetch(
        `${GRAPH_URL}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
      );
      const igLinkData = await igLinkRes.json() as any;
      const igAccountId = igLinkData.instagram_business_account?.id;
      if (!igAccountId) continue; // this Page has no linked IG Business account

      const igProfileRes = await fetch(`${GRAPH_URL}/${igAccountId}?fields=username&access_token=${page.access_token}`);
      const igProfileData = await igProfileRes.json() as any;

      // Store the Page access token, not the user token — Instagram Graph API calls
      // for a linked account are made with the Page's token.
      const accessTokenEnc = encrypt(page.access_token);

      await pool.query(
        `INSERT INTO public.social_accounts (client_id, platform, account_label, platform_user_id, encrypted_access_token, access_token_iv, token_expires_at)
         VALUES ($1, 'instagram', $2, $3, $4, $5, $6)
         ON CONFLICT (platform_user_id) DO UPDATE SET
           client_id = EXCLUDED.client_id, encrypted_access_token = EXCLUDED.encrypted_access_token,
           access_token_iv = EXCLUDED.access_token_iv, token_expires_at = EXCLUDED.token_expires_at`,
        [
          parsedState.clientId || null,
          parsedState.label || igProfileData.username || page.name,
          igAccountId,
          accessTokenEnc.encrypted,
          accessTokenEnc.iv,
          expiresAt,
        ]
      );
      connectedCount++;
    }

    if (connectedCount === 0) {
      return res.redirect(`${process.env.FRONTEND_URL}/social?error=instagram_no_linked_account`);
    }

    res.redirect(`${process.env.FRONTEND_URL}/social?connected=instagram&count=${connectedCount}`);
  } catch (err) {
    console.error('Instagram OAuth callback error:', err);
    res.status(500).send('Something went wrong connecting your Instagram account');
  }
});

export default router;
