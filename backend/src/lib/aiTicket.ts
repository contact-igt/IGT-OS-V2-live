import { Pool } from 'pg';
import { verifyAiTicket } from './tokens';

// Shared by every server-to-server AI call: validates the short-lived ticket, confirms the account is
// still active, and applies a per-user sliding-window rate limit (in-memory: single backend instance).
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const hits = new Map<string, number[]>();

export interface AiCaller { id: string; role: string; name: string; department: string | null }
export class AiAuthError extends Error { constructor(public status: number, message: string) { super(message); } }

export async function authenticateAiCaller(pool: Pool, authorization: string | undefined): Promise<AiCaller> {
  const bearer = authorization?.split(' ')[1];
  if (!bearer) throw new AiAuthError(401, 'Unauthorized');
  let userId: string;
  try { userId = verifyAiTicket(bearer).id; } catch { throw new AiAuthError(401, 'Invalid or expired ticket'); }

  const u = await pool.query('SELECT id, role, name, department FROM public.users WHERE id = $1 AND is_active = true', [userId]);
  if (u.rows.length === 0) throw new AiAuthError(401, 'Unauthorized');

  const now = Date.now();
  const recent = (hits.get(userId) || []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) { hits.set(userId, recent); throw new AiAuthError(429, 'Too many AI requests - try again in a minute'); }
  recent.push(now); hits.set(userId, recent);
  return u.rows[0];
}
