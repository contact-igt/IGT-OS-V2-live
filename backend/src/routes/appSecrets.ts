import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import crypto from 'crypto';
import { encrypt, decrypt } from '../lib/crypto';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Known secret slots the Credentials page can manage. Adding a new one here (and its
// env-var fallback name) is the only change needed to surface it in the UI — no schema
// change, since app_secrets is a generic key_name -> encrypted_value table.
const KNOWN_KEYS: Record<string, { label: string; envFallback?: string }> = {
  OPENAI_API_KEY: { label: 'OpenAI API Key', envFallback: 'OPENAI_API_KEY' },
  ANTHROPIC_API_KEY: { label: 'Anthropic API Key', envFallback: 'ANTHROPIC_API_KEY' },
  GEMINI_API_KEY: { label: 'Google Gemini API Key', envFallback: 'GEMINI_API_KEY' },
};

// GET /api/app-secrets — admin-only, metadata only. Never returns the decrypted value —
// once a secret is saved, the UI only ever shows whether it's configured, matching normal
// secret-manager UX (write-only from the browser's perspective).
router.get('/', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const result = await pool.query('SELECT key_name, updated_at FROM public.app_secrets');
    const byKey: Record<string, any> = {};
    for (const row of result.rows) byKey[row.key_name] = row;

    const slots = Object.entries(KNOWN_KEYS).map(([keyName, meta]) => ({
      keyName,
      label: meta.label,
      hasDbValue: !!byKey[keyName],
      hasEnvFallback: !!(meta.envFallback && process.env[meta.envFallback]),
      updatedAt: byKey[keyName]?.updated_at || null,
    }));

    res.json(slots);
  } catch (error) {
    console.error('Error fetching app secrets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/app-secrets/:keyName — admin-only, body { value }
router.put('/:keyName', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const { keyName } = req.params;
  if (!KNOWN_KEYS[keyName]) return res.status(400).json({ error: 'Unknown secret key' });

  const { value } = req.body;
  if (!value || typeof value !== 'string') {
    return res.status(400).json({ error: 'value is required' });
  }

  try {
    const enc = encrypt(value);
    await pool.query(
      `INSERT INTO public.app_secrets (key_name, encrypted_value, value_iv, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (key_name) DO UPDATE SET
         encrypted_value = EXCLUDED.encrypted_value, value_iv = EXCLUDED.value_iv,
         updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [keyName, enc.encrypted, enc.iv, req.user.id]
    );
    res.status(204).send();
  } catch (error) {
    console.error('Error saving app secret:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/app-secrets/:keyName — admin-only, removes the DB override (falls back to
// the env var, if any, once removed)
router.delete('/:keyName', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    await pool.query('DELETE FROM public.app_secrets WHERE key_name = $1', [req.params.keyName]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting app secret:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/app-secrets/internal/:keyName — server-to-server only, for the frontend's own
// Next.js API routes to resolve a key at request time. Gated by a shared secret header
// (not a user JWT) since the caller is another server, not a browser; never reachable
// without INTERNAL_API_SECRET, and the decrypted value never crosses into browser-facing
// responses anywhere else in this router.
router.get('/internal/:keyName', async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const provided = req.header('x-internal-secret');
  const expected = process.env.INTERNAL_API_SECRET;
  // Constant-time comparison (equal-length digests) so the shared secret cannot be recovered by timing.
  const digest = (v: string) => crypto.createHash('sha256').update(v).digest();
  if (!expected || !provided || !crypto.timingSafeEqual(digest(provided), digest(expected))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { keyName } = req.params;
  if (!KNOWN_KEYS[keyName]) return res.status(400).json({ error: 'Unknown secret key' });

  try {
    const result = await pool.query('SELECT encrypted_value, value_iv FROM public.app_secrets WHERE key_name = $1', [keyName]);
    if (result.rows.length === 0) return res.json({ value: null });

    const value = decrypt(result.rows[0].encrypted_value, result.rows[0].value_iv);
    res.json({ value });
  } catch (error) {
    console.error('Error resolving internal secret:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
