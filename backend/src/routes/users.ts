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

// GET /me — the authenticated user's own row, including fields not exposed on the
// roster endpoint above (e.g. github_username, used to attribute GitHub commits).
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const userId = (req as any).user.id;

  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.department, u.avatar_url, u.github_username, u.must_change_password,
              (SELECT COALESCE(array_agg(page_path), ARRAY[]::text[]) FROM public.page_access WHERE user_id = u.id) AS granted_pages
       FROM public.users u WHERE u.id = $1`,
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching own user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /me — self-service update of the authenticated user's own GitHub username, so
// future commit/PR webhook events can be attributed to them (see githubWebhook.ts).
router.patch('/me', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const userId = (req as any).user.id;
  const { githubUsername } = req.body;

  if (githubUsername !== null && typeof githubUsername !== 'string') {
    return res.status(400).json({ error: 'githubUsername must be a string or null' });
  }
  const cleaned = githubUsername ? githubUsername.trim().replace(/^@/, '') : null;
  if (cleaned && !/^[A-Za-z0-9-]{1,39}$/.test(cleaned)) {
    return res.status(400).json({ error: 'That doesn\'t look like a valid GitHub username' });
  }

  try {
    const result = await pool.query(
      `UPDATE public.users SET github_username = $1 WHERE id = $2
       RETURNING id, name, email, role, department, avatar_url, github_username, must_change_password`,
      [cleaned, userId]
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') { // unique_violation
      return res.status(409).json({ error: 'That GitHub username is already linked to another account' });
    }
    console.error('Error updating github_username:', error);
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

// POST /:id/admin-reset-password — admin-only: generates a fresh temp password for another
// user, same one-time-plaintext-in-the-response pattern as account creation above. Forces
// must_change_password so the temp value can't linger as their real password, and clears
// any lockout state. Distinct from /forgot-password + /reset-password (the employee's own
// self-service flow) — this is the admin doing it on someone else's behalf.
router.post('/:id/admin-reset-password', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const { id } = req.params;

  try {
    const userResult = await pool.query('SELECT id, name FROM public.users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 12);

    await pool.query(
      `UPDATE public.users
       SET password_hash = $1, must_change_password = true, failed_login_attempts = 0, locked_until = NULL
       WHERE id = $2`,
      [hash, id]
    );

    res.json({ tempPassword });
  } catch (error: any) {
    console.error('Error resetting user password:', error);
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
