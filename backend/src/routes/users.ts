import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Any authenticated user can read the roster (needed to populate assignee pickers
// and the frontend's mock-id <-> real-id mapping) — only non-sensitive columns are selected.
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const result = await pool.query(
      `SELECT id, name, email, role, department, avatar_url, must_change_password 
       FROM public.users 
       ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let pass = '';
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

const VALID_ROLES = ['admin', 'ops', 'team', 'viewer'];
const VALID_DEPARTMENTS = ['bd', 'operations', 'design', 'development', 'video', 'performance_marketing', 'sales'];

// POST / — admin-only: actually creates a real, loginable account. Returns the one-time
// plaintext temp password so the admin can hand it to the new hire; never stored or
// logged anywhere past this single response.
router.post('/', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { name, email, role, department, password } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }
    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
    }
    if (department && !VALID_DEPARTMENTS.includes(department)) {
      return res.status(400).json({ error: `department must be one of: ${VALID_DEPARTMENTS.join(', ')}` });
    }

    const tempPassword = password || generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 12);

    const result = await pool.query(
      `INSERT INTO public.users (name, email, role, department, password_hash, must_change_password, is_active)
       VALUES ($1, $2, $3, $4, $5, true, true)
       RETURNING id, name, email, role, department, must_change_password`,
      [name, email.toLowerCase(), role || 'team', department || null, hash]
    );

    res.status(201).json({ user: result.rows[0], tempPassword });
  } catch (error: any) {
    if (error.code === '23505') { // unique_violation on email
      return res.status(409).json({ error: 'A user with that email already exists' });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /forgot-password — public. Generic-enough response (found vs not) so the frontend
// knows whether to show the reset form, without this being a hardened anti-enumeration
// flow — acceptable for a small admin-provisioned team, not for a public-signup product.
router.post('/forgot-password', async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const result = await pool.query(
      'SELECT id FROM public.users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.json({ ok: false, error: 'No account found with that email' });
    }
    res.json({ ok: true });
  } catch (error: any) {
    console.error('Error in forgot-password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /reset-password — public. Sets a real new password, lifts any lockout, and
// notifies every admin that this account's password was changed via self-service.
router.post('/reset-password', async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'email and a password of at least 6 characters are required' });
    }

    const userResult = await pool.query(
      'SELECT id, name FROM public.users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'No account found with that email' });
    }
    const user = userResult.rows[0];

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      `UPDATE public.users
       SET password_hash = $1, must_change_password = false, failed_login_attempts = 0, locked_until = NULL
       WHERE id = $2`,
      [hash, user.id]
    );

    await pool.query(
      `INSERT INTO public.notifications (user_id, type, message)
       SELECT id, 'status_change', $1 FROM public.users WHERE role = 'admin'`,
      [`${user.name} reset their password via Forgot Password`]
    );

    res.json({ ok: true });
  } catch (error: any) {
    console.error('Error in reset-password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/set-password', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  const { password } = req.body;
  const userId = (req as any).user.id;

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE public.users SET password_hash = $1, must_change_password = false WHERE id = $2',
      [hash, userId]
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error setting password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
