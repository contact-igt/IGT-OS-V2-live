import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { encrypt } from '../lib/crypto';
import { requireAuth } from '../middleware/auth';
import { getValidAccessToken } from '../lib/googleAccount';

const router = Router();

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

function redirectUri(): string {
  return `${process.env.BACKEND_URL}/api/google/callback`;
}

// Step 1: kick off a combined Calendar + Gmail OAuth grant for the caller's own Google
// account. This is a full-page browser redirect (not an XHR), so it can't carry an
// Authorization header — the caller's real backend user id is passed as a query param
// instead, same trust model already used by youtubeAuth.ts's /connect for clientId.
router.get('/connect', (req: Request, res: Response) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).send('Missing userId');

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri(),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent select_account',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
    state: JSON.stringify({ userId }),
  });

  res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
});

// Step 2: handle Google's redirect back with the auth code
router.get('/callback', async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  const { code, state } = req.query;

  if (!code) return res.status(400).send('Missing authorization code');

  let parsedState: any = {};
  try { parsedState = JSON.parse((state as string) || '{}'); } catch (e) {}
  const userId = parsedState.userId;
  if (!userId) return res.status(400).send('Missing user reference');

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
      console.error('Google token exchange failed:', tokenData);
      return res.status(500).send('Failed to exchange authorization code');
    }

    const accessTokenEnc = encrypt(tokenData.access_token);
    const refreshTokenEnc = tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null;
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    const scopes = (tokenData.scope || '').split(' ').filter(Boolean);

    // Fetch the connected account's own email so it can be shown in the UI — the whole
    // point being that a mismatched OAuth consent (wrong Google account picked at sign-in)
    // becomes immediately visible instead of silently surfacing another employee's calendar.
    let email: string | null = null;
    try {
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userinfoRes.ok) {
        const userinfo = await userinfoRes.json() as any;
        email = userinfo.email || null;
      }
    } catch (err) {
      console.error('Failed to fetch Google account email:', err);
    }

    // A repeat connect without a fresh refresh_token (Google only issues one on the first
    // consent, or when prompt=consent forces re-issue) keeps the existing one rather than
    // overwriting it with NULL.
    await pool.query(
      `INSERT INTO public.google_accounts (user_id, email, encrypted_access_token, access_token_iv, encrypted_refresh_token, refresh_token_iv, token_expires_at, scopes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id) DO UPDATE SET
         email = COALESCE(EXCLUDED.email, public.google_accounts.email),
         encrypted_access_token = EXCLUDED.encrypted_access_token,
         access_token_iv = EXCLUDED.access_token_iv,
         encrypted_refresh_token = COALESCE(EXCLUDED.encrypted_refresh_token, public.google_accounts.encrypted_refresh_token),
         refresh_token_iv = COALESCE(EXCLUDED.refresh_token_iv, public.google_accounts.refresh_token_iv),
         token_expires_at = EXCLUDED.token_expires_at,
         scopes = EXCLUDED.scopes`,
      [userId, email, accessTokenEnc.encrypted, accessTokenEnc.iv, refreshTokenEnc?.encrypted || null, refreshTokenEnc?.iv || null, expiresAt, scopes]
    );

    res.redirect(`${process.env.FRONTEND_URL}/calendar?connected=google`);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    res.status(500).send('Something went wrong connecting your Google account');
  }
});

// GET /api/google/status — is the caller connected?
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const result = await pool.query('SELECT scopes, email FROM public.google_accounts WHERE user_id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.json({ connected: false, scopes: [], email: null });
    }

    let email = result.rows[0].email;
    // Backfill for accounts connected before email capture existed — no need to make the
    // user reconnect, since the already-stored access/refresh token is enough on its own to
    // ask Google who this is.
    if (!email) {
      try {
        const accessToken = await getValidAccessToken(pool, req.user.id);
        if (accessToken) {
          const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (userinfoRes.ok) {
            const userinfo = await userinfoRes.json() as any;
            if (userinfo.email) {
              email = userinfo.email;
              await pool.query('UPDATE public.google_accounts SET email = $1 WHERE user_id = $2', [email, req.user.id]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to backfill Google account email:', err);
      }
    }

    res.json({ connected: true, scopes: result.rows[0].scopes || [], email: email || null });
  } catch (error) {
    console.error('Error checking Google connection status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/google/calendar/events?start=&end=
router.get('/calendar/events', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const accessToken = await getValidAccessToken(pool, req.user.id);
    if (!accessToken) return res.status(404).json({ error: 'Google account not connected' });

    const { start, end } = req.query;
    const params = new URLSearchParams({ singleEvents: 'true', orderBy: 'startTime' });
    if (start) params.set('timeMin', new Date(start as string).toISOString());
    if (end) params.set('timeMax', new Date(end as string).toISOString());

    const eventsRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data: any = await eventsRes.json();
    if (!eventsRes.ok) {
      console.error('Google Calendar API error:', data);
      return res.status(502).json({ error: 'Failed to fetch calendar events' });
    }
    res.json(data.items || []);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function extractPart(part: any, mimeType: string): string {
  if (!part) return '';
  if (part.mimeType === mimeType && part.body?.data) {
    // Gmail base64url-encodes body data (- and _ instead of + and /), unlike standard base64.
    return Buffer.from(part.body.data, 'base64').toString('utf-8');
  }
  if (part.parts) {
    for (const p of part.parts) {
      const text = extractPart(p, mimeType);
      if (text) return text;
    }
  }
  return '';
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function htmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  ).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

// Most Fathom/Gemini recap emails are HTML-only (no text/plain alternative) — falling back
// to Gmail's snippet field silently truncated the transcript to ~200 chars, which is what
// was happening here. Prefer text/plain when present, otherwise strip the HTML body down
// to readable text instead of settling for the snippet.
function extractEmailBody(payload: any): string {
  const plain = extractPart(payload, 'text/plain');
  if (plain) return plain;
  const html = extractPart(payload, 'text/html');
  if (html) return htmlToText(html);
  return '';
}

// GET /api/google/gmail/meeting-recaps — real Fathom/Gemini recap emails from the last 14 days
router.get('/gmail/meeting-recaps', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const accessToken = await getValidAccessToken(pool, req.user.id);
    if (!accessToken) return res.status(404).json({ error: 'Google account not connected' });

    const q = 'from:(no-reply@fathom.video OR gemini-notes@google.com) newer_than:14d';
    const listRes = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=10`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const listData: any = await listRes.json();
    if (!listRes.ok) {
      console.error('Gmail list error:', listData);
      return res.status(502).json({ error: 'Failed to list Gmail messages' });
    }

    const messages = listData.messages || [];
    const recaps = await Promise.all(messages.map(async (m: any) => {
      const msgRes = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const msg: any = await msgRes.json();
      const headers = msg.payload?.headers || [];
      const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      return {
        id: m.id,
        subject: getHeader('Subject'),
        sender: getHeader('From'),
        date: getHeader('Date'),
        preview: msg.snippet || '',
        body: extractEmailBody(msg.payload) || msg.snippet || '',
      };
    }));

    res.json(recaps);
  } catch (error) {
    console.error('Error fetching Gmail meeting recaps:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
