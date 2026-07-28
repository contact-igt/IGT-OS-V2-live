import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { logAudit } from '../lib/auditLog';
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  generateRefreshToken,
  hashRefreshToken,
  setAuthCookies,
  signAccessToken,
} from '../lib/tokens';

const router = Router();

// How long a just-rotated (revoked) refresh token is still allowed to resolve forward via
// its replaced_by chain instead of being rejected outright. Covers the window where a
// second tab/request, holding the same cookie value the first request just rotated away,
// arrives moments later — without this, that second request 401s and logs the user out of
// a session that was never actually compromised. Kept short: it only ever forgives a token
// revoked by the legitimate client's own very next refresh, not an older stolen one.
const ROTATION_GRACE_MS = 15 * 1000;
const MAX_CHAIN_HOPS = 5;

// POST /api/auth/refresh — reads the HttpOnly refresh cookie, checks it against
// public.refresh_tokens, and rotates it: the old row is revoked and a brand new
// access + refresh cookie pair is issued. Rotation means a stolen refresh token is
// only ever usable once before the legitimate client's next refresh invalidates it.
router.post('/refresh', async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const presented = req.cookies?.[REFRESH_COOKIE];
  if (!presented) return res.status(401).json({ error: 'No refresh token' });

  try {
    const presentedHash = hashRefreshToken(presented);
    let row = (await pool.query(
      `SELECT rt.id, rt.user_id, rt.revoked_at, rt.replaced_by, u.email, u.role, u.department, u.name, u.is_active
       FROM public.refresh_tokens rt
       JOIN public.users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1 AND rt.expires_at > NOW()`,
      [presentedHash]
    )).rows[0];

    if (!row) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Already rotated. If it happened moments ago, walk the chain to whatever row replaced
    // it (and that row's replacement, etc.) instead of failing — this is what makes a
    // same-cookie race between two tabs resolve into two successful refreshes rather than
    // one success and one hard logout.
    if (row.revoked_at) {
      const revokedMsAgo = Date.now() - new Date(row.revoked_at).getTime();
      if (revokedMsAgo > ROTATION_GRACE_MS) {
        clearAuthCookies(res);
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }

      let hops = 0;
      while (row.revoked_at && row.replaced_by && hops < MAX_CHAIN_HOPS) {
        row = (await pool.query(
          `SELECT rt.id, rt.user_id, rt.revoked_at, rt.replaced_by, u.email, u.role, u.department, u.name, u.is_active
           FROM public.refresh_tokens rt
           JOIN public.users u ON u.id = rt.user_id
           WHERE rt.id = $1 AND rt.expires_at > NOW()`,
          [row.replaced_by]
        )).rows[0];
        hops++;
      }

      if (!row || row.revoked_at) {
        // Chain broken or still not at a live token — genuinely stale/invalid, not a race.
        clearAuthCookies(res);
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }
    }

    if (!row.is_active) {
      clearAuthCookies(res);
      return res.status(403).json({ error: 'Account is disabled' });
    }

    // Rotate: revoke the (now-confirmed-live) token, link it to a freshly minted one, and
    // issue that new pair of cookies.
    const { token: newRefreshToken, hash: newHash, expiresAt } = generateRefreshToken();
    const inserted = await pool.query(
      'INSERT INTO public.refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING id',
      [row.user_id, newHash, expiresAt]
    );
    await pool.query(
      'UPDATE public.refresh_tokens SET revoked_at = NOW(), replaced_by = $1 WHERE id = $2',
      [inserted.rows[0].id, row.id]
    );

    const accessToken = signAccessToken({
      id: row.user_id,
      email: row.email,
      role: row.role,
      department: row.department || '',
      name: row.name || '',
    });

    setAuthCookies(res, accessToken, newRefreshToken);
    res.json({ success: true });
  } catch (err) {
    console.error('/api/auth/refresh error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout — revokes the current refresh token (if any) so it can't be
// replayed, then clears both cookies. Best-effort: a missing/already-invalid cookie
// still results in a clean logout from the browser's point of view.
router.post('/logout', async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  const presented = req.cookies?.[REFRESH_COOKIE];

  try {
    if (pool && presented) {
      const presentedHash = hashRefreshToken(presented);
      const result = await pool.query(
        `UPDATE public.refresh_tokens SET revoked_at = NOW()
         WHERE token_hash = $1 AND revoked_at IS NULL
         RETURNING user_id`,
        [presentedHash]
      );
      if (result.rows.length > 0) {
        const userRow = await pool.query('SELECT name FROM public.users WHERE id = $1', [result.rows[0].user_id]);
        logAudit(pool, {
          actorId: result.rows[0].user_id,
          actorName: userRow.rows[0]?.name || result.rows[0].user_id,
          action: 'logout',
          entity: 'Auth',
          entityRef: userRow.rows[0]?.name || result.rows[0].user_id,
        });
      }
    }
  } catch (err) {
    console.error('/api/auth/logout error:', err);
  }

  clearAuthCookies(res);
  res.json({ success: true });
});

export default router;
