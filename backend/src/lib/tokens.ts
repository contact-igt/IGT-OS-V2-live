import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { CookieOptions, Response } from 'express';

export const ACCESS_COOKIE = 'igt_access_token';
export const REFRESH_COOKIE = 'igt_refresh_token';

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const isProd = process.env.NODE_ENV === 'production';

// No guessable fallback: production must configure JWT_SECRET; dev gets a per-process random
// secret (sessions reset on restart) so a forgotten env var can never yield forgeable tokens.
function resolveJwtSecret(): string {
  const configured = process.env.JWT_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (isProd) throw new Error('JWT_SECRET must be set (min 32 chars) in production');
  console.warn('[auth] JWT_SECRET missing/short - using an ephemeral random secret for this process');
  return crypto.randomBytes(48).toString('hex');
}
const JWT_SECRET = resolveJwtSecret();

export interface AccessTokenPayload {
  id: string;
  email: string;
  role: string;
  department: string;
  name: string;
}

// Cross-domain deployments (frontend + backend on separate hosts) need SameSite=None,
// which browsers only honor alongside Secure — so Secure/None only turns on together
// in production. Local dev keeps Lax so cookies still work over plain http://localhost.
function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    domain: process.env.COOKIE_DOMAIN || undefined,
  };
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL_MS / 1000 });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as AccessTokenPayload & { typ?: string };
  // AI tickets share the signing key but are not sessions - never accept them as access tokens.
  if (payload.typ) throw new jwt.JsonWebTokenError('wrong token type');
  return payload;
}

// Short-lived, single-purpose ticket the browser presents to the Next.js AI routes (which
// cannot see the backend's HttpOnly cookie on cross-site deployments).
export const AI_TICKET_TTL_SEC = 5 * 60;
export function signAiTicket(userId: string): string {
  return jwt.sign({ typ: 'ai-ticket', id: userId }, JWT_SECRET, { expiresIn: AI_TICKET_TTL_SEC });
}
export function verifyAiTicket(token: string): { id: string } {
  const payload = jwt.verify(token, JWT_SECRET) as { typ?: string; id?: string };
  if (payload.typ !== 'ai-ticket' || !payload.id) throw new jwt.JsonWebTokenError('wrong token type');
  return { id: payload.id };
}

// Refresh tokens are opaque (not JWTs) so a stolen DB row reveals nothing usable — only
// the sha256 hash is persisted, and the raw value is compared by re-hashing on refresh.
export function generateRefreshToken(): { token: string; hash: string; expiresAt: Date } {
  const token = crypto.randomBytes(48).toString('hex');
  const hash = hashRefreshToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  return { token, hash, expiresAt };
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions(),
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_MS,
  });
  // Scoped to /api/auth — the only paths that ever need to read it — so it isn't sent
  // on every single API request the way the access token cookie is.
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookieOptions(), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...baseCookieOptions(), path: '/api/auth' });
}
