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
  if (!data.access_token) throw new Error('Failed to refresh Google token');

  const accessTokenEnc = encrypt(data.access_token);
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await pool.query(
    `UPDATE public.google_accounts SET encrypted_access_token = $1, access_token_iv = $2, token_expires_at = $3 WHERE id = $4`,
    [accessTokenEnc.encrypted, accessTokenEnc.iv, expiresAt, account.id]
  );

  return data.access_token;
}

// Returns null if this user has never connected a Google account.
export async function getValidAccessToken(pool: Pool, userId: string): Promise<string | null> {
  const result = await pool.query('SELECT * FROM public.google_accounts WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) return null;

  const account = result.rows[0];
  const isExpired = !account.token_expires_at || new Date(account.token_expires_at) < new Date();
  if (isExpired) return refreshAccessToken(pool, account);
  return decrypt(account.encrypted_access_token, account.access_token_iv);
}
