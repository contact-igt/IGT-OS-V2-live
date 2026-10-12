import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { requireAuth, requireRole } from '../middleware/auth';
import { logAudit } from '../lib/auditLog';
import { getDestination } from '../lib/destination';

const router = Router();
const resetRequests = new Map<string, number>();
const RESET_REQUEST_COOLDOWN_MS = 10 * 60 * 1000;

// Any authenticated user can read the roster (needed to populate assignee pickers
// and the frontend's mock-id <-> real-id mapping) — only non-sensitive columns are selected.
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const result = await pool.query(
      `SELECT id, name, email, role, department, avatar_url, color, must_change_password, employee_id, title, is_head_of_department
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
  const userEmail = (req as any).user.email;

  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.department, u.avatar_url, u.color, u.github_username, u.must_change_password,
              u.employee_id, u.title, u.is_head_of_department,
              (SELECT COALESCE(array_agg(page_path), ARRAY[]::text[]) FROM public.page_access WHERE user_id = u.id) AS granted_pages
       FROM public.users u WHERE u.id = $1 OR (u.email IS NOT NULL AND LOWER(u.email) = LOWER($2))`,
      [userId, userEmail || '']
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const row = result.rows[0];
    // Included so a page refresh (session restore via cookie) redirects the same way a
    // fresh login would, without the frontend re-deriving this role/department branching.
    res.json({ ...row, destination: getDestination(row) });
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
// 'super_admin' is deliberately excluded from VALID_ROLES (create-employee form) — it's
// not something a new hire is ever created as, only granted to an existing account via the
// PUT /:id role-change path below.
const UPDATABLE_ROLES = [...VALID_ROLES, 'super_admin'];
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

    logAudit(pool, {
      actorId: req.user.id,
      actorName: req.user.name || req.user.email,
      action: 'employee_created',
      entity: 'Employee',
      entityRef: result.rows[0].name,
      entityId: result.rows[0].id,
      meta: { email: result.rows[0].email, role: result.rows[0].role, department: result.rows[0].department },
    });

    res.status(201).json({ user: result.rows[0], tempPassword });
  } catch (error: any) {
    if (error.code === '23505') { // unique_violation on email
      return res.status(409).json({ error: 'A user with that email already exists' });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id — update user details (color, role, department) in database. Admin-only: this
// changes another employee's privilege level, so it must not be reachable by a plain
// authenticated user calling the API directly (the previous version had no role gate at all).
router.put('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const { id } = req.params;
  const { color, role, department } = req.body;

  if (role && !UPDATABLE_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${UPDATABLE_ROLES.join(', ')}` });
  }
  if (department && !VALID_DEPARTMENTS.includes(department)) {
    return res.status(400).json({ error: `department must be one of: ${VALID_DEPARTMENTS.join(', ')}` });
  }

  try {
    // Privilege boundary: an admin must not be able to mint a super_admin (themselves included)
    // or alter an existing one - only a super_admin can.
    if (req.user.role !== 'super_admin') {
      const target = await pool.query('SELECT role FROM public.users WHERE id = $1', [id]);
      if (role === 'super_admin' || target.rows[0]?.role === 'super_admin') {
        return res.status(403).json({ error: 'Only a super admin can grant or change the super admin role' });
      }
    }
    const result = await pool.query(
      `UPDATE public.users
       SET color = COALESCE($1, color),
           role = COALESCE($2, role),
           department = COALESCE($3, department)
       WHERE id = $4
       RETURNING id, name, email, role, department, avatar_url, color, must_change_password`,
      [color || null, role || null, department || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    // Only role/department changes are audit-worthy — a color tweak isn't a privilege or
    // org-structure change, so logging it on every pick would just be noise.
    if (role || department) {
      logAudit(pool, {
        actorId: req.user.id,
        actorName: req.user.name || req.user.email,
        action: 'employee_updated',
        entity: 'Employee',
        entityRef: result.rows[0].name,
        entityId: result.rows[0].id,
        meta: { role: role || undefined, department: department || undefined },
      });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating user:', error);
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

  // Always the same answer, whether or not the account exists (no account enumeration).
  const generic = { ok: true, message: 'If that account exists, your administrator has been notified and will issue a temporary password.' };
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) return res.status(400).json({ error: 'email is required' });

    const result = await pool.query('SELECT id, name FROM public.users WHERE email = $1 AND is_active = true', [email]);
    const last = resetRequests.get(email) || 0;
    if (result.rows.length > 0 && Date.now() - last > RESET_REQUEST_COOLDOWN_MS) {
      resetRequests.set(email, Date.now());
      // Admins act on this via POST /:id/admin-reset-password (one-time temp password, forced change).
      await pool.query(
        `INSERT INTO public.notifications (user_id, type, message)
         SELECT id, 'status_change', $1 FROM public.users WHERE role IN ('admin', 'super_admin') AND is_active = true`,
        [`${result.rows[0].name} requested a password reset - issue a temporary password from Admin`]
      );
    }
    res.json(generic);
  } catch (error: any) {
    console.error('Error in forgot-password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /reset-password was removed: it accepted an email + new password from ANYONE with no proof of
// identity (full account takeover). Resets are admin-issued via /:id/admin-reset-password until an
// emailed, single-use, expiring token flow exists (needs an approved mail provider).
router.post('/reset-password', (_req: Request, res: Response) => {
  res.status(410).json({ error: 'Self-service reset is disabled. Ask your administrator for a temporary password.' });
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
