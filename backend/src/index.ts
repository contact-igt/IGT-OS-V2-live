import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { Pool, types } from 'pg';

// node-postgres parses DATE columns into a JS Date at local midnight by default,
// which silently shifts the calendar date when re-serialized via toISOString() on
// a server whose local timezone is ahead of UTC (e.g. IST). Returning the raw
// 'YYYY-MM-DD' string instead avoids that entirely — callers do their own
// date/time composition (see tasks.ts's serializeTask).
types.setTypeParser(1082, (val) => val);

import userRoutes from './routes/users';
import taskRoutes from './routes/tasks';
import notificationRoutes from './routes/notifications';
import clientRoutes from './routes/clients';
import campaignRoutes from './routes/campaigns';
import analyticsRoutes from './routes/analytics';
import healthRoutes from './routes/health';
import timeLogsRoutes from './routes/time_logs';
import attendanceRoutes from './routes/attendance';
import githubWebhookRoutes from './routes/githubWebhook';
import githubDataRoutes from './routes/githubData';
import instagramAuthRoutes from './routes/instagramAuth';
import youtubeAuthRoutes from './routes/youtubeAuth';
import socialSyncRoutes from './routes/socialSync';
import agencyMetricsRoutes from './routes/agencyMetrics';
import pageAccessRoutes from './routes/pageAccess';
import architectureDocsRoutes from './routes/architectureDocs';
import auditLogRoutes from './routes/auditLog';
import meetingsRoutes from './routes/meetings';
import googleAuthRoutes from './routes/googleAuth';
import appSecretsRoutes from './routes/appSecrets';
import loginHeroRoute, { heroCache, buildPrompt, fallbacks, resolveRoleKey } from './routes/loginHero.route';
import authRoutes from './routes/auth';
import { requireAuth, requirePageAccess } from './middleware/auth';
import { logAudit } from './lib/auditLog';
import { setAuthCookies, signAccessToken, generateRefreshToken } from './lib/tokens';
import { getDestination } from './lib/destination';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Coarse UA parsing for the audit log's Device column — good enough to distinguish
// "Chrome / Windows" from "Safari / iOS" without pulling in a UA-parsing dependency.
function parseDevice(userAgent: string | undefined): string {
  const ua = userAgent || '';
  let browser = 'Unknown';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/chrome\//i.test(ua)) browser = 'Chrome';
  else if (/firefox\//i.test(ua)) browser = 'Firefox';
  else if (/safari\//i.test(ua)) browser = 'Safari';

  let os = 'Unknown';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os|macintosh/i.test(ua)) os = 'MacOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ios/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  return `${browser} / ${os}`;
}

function getClientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) return xff.split(',')[0].trim();
  return req.socket.remoteAddress || req.ip || 'Unknown';
}

// Every login attempt (success, wrong password, lockout, unknown email) writes one row
// here — previously only a running failed_login_attempts counter existed on the user row,
// with no timestamped history at all, so "Failed Logins" / "Recent Critical Events" on the
// audit dashboard had nothing real to show.
function logAuthEvent(pool: Pool, req: Request, params: { actorId: string | null; actorName: string; action: string; reason?: string }) {
  logAudit(pool, {
    actorId: params.actorId,
    actorName: params.actorName,
    action: params.action,
    entity: 'Auth',
    entityRef: params.actorName,
    entityId: params.actorId,
    meta: { ip: getClientIp(req), device: parseDevice(req.headers['user-agent'] as string), reason: params.reason },
  });
}

// Disable ETags and force fresh API responses without 304 stale caching
app.set('etag', false);
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Setup CORS and JSON parsing. `credentials: true` + an explicit origin (rather than '*')
// is required for the browser to accept and send the HttpOnly auth cookies cross-origin.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map(o => o.trim());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(cookieParser());
// Must be mounted BEFORE express.json() below — the webhook needs the raw request
// body (as Express received it) to verify GitHub's HMAC signature; once express.json()
// has parsed it, the original bytes are gone.
app.use('/api/webhooks/github', express.raw({ type: 'application/json' }), githubWebhookRoutes);
// Default 100kb is too small for a pasted-in markdown architecture doc.
app.use(express.json({ limit: '2mb' }));

// Initialize PG Pool if DATABASE_URL is available
let pool: Pool | null = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  app.locals.pool = pool;

  app.post('/api/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (!pool) {
      return res.status(500).json({ error: 'Database is not configured.' });
    }

    try {
      // 1. Fetch user from PostgreSQL
      const result = await pool.query('SELECT * FROM public.users WHERE email = $1', [email.toLowerCase()]);

      if (result.rows.length === 0) {
        logAuthEvent(pool, req, { actorId: null, actorName: email, action: 'login_failed', reason: 'unknown_email' });
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const user = result.rows[0];

      // 1.5. Check if active
      if (!user.is_active) {
        logAuthEvent(pool, req, { actorId: user.id, actorName: user.name, action: 'login_blocked', reason: 'account_disabled' });
        return res.status(403).json({ error: 'Account is disabled. Please contact admin.' });
      }

      // 1.6. Check if locked out
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        logAuthEvent(pool, req, { actorId: user.id, actorName: user.name, action: 'login_blocked', reason: 'locked_out' });
        return res.status(423).json({ error: 'Account locked due to multiple failed attempts. Try again later.' });
      }

      // 2. Verify hashed password
      const isMatch = await bcrypt.compare(password, user.password_hash);

      if (!isMatch) {
        const newAttempts = (user.failed_login_attempts || 0) + 1;
        if (newAttempts >= 5) {
          // Lock out for 30 minutes
          await pool.query(
            "UPDATE public.users SET failed_login_attempts = $1, locked_until = NOW() + INTERVAL '30 minutes' WHERE id = $2",
            [newAttempts, user.id]
          );
          logAuthEvent(pool, req, { actorId: user.id, actorName: user.name, action: 'login_blocked', reason: 'locked_out_now' });
          return res.status(423).json({ error: 'Account locked due to multiple failed attempts. Try again later.' });
        } else {
          await pool.query(
            "UPDATE public.users SET failed_login_attempts = $1 WHERE id = $2",
            [newAttempts, user.id]
          );
          logAuthEvent(pool, req, { actorId: user.id, actorName: user.name, action: 'login_failed', reason: 'wrong_password' });
          return res.status(401).json({ error: 'Invalid email or password.' });
        }
      }

      // 3. Password is correct, reset lockout counters
      await pool.query(
        "UPDATE public.users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1",
        [user.id]
      );
      logAuthEvent(pool, req, { actorId: user.id, actorName: user.name, action: 'login_success' });

      // 4. Issue an access token (short-lived, JWT) + refresh token (opaque, DB-backed)
      // as HttpOnly cookies instead of handing a bearer token back for the frontend to
      // store itself — see backend/src/lib/tokens.ts.
      const accessToken = signAccessToken({
        id:         user.id,
        email:      user.email,
        role:       user.role,
        department: user.department || '',
        name:       user.name       || '',
      });

      const { token: refreshToken, hash: refreshHash, expiresAt } = generateRefreshToken();
      await pool.query(
        'INSERT INTO public.refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [user.id, refreshHash, expiresAt]
      );
      // Opportunistic housekeeping so this table doesn't grow unbounded with dead rows.
      pool.query(
        "DELETE FROM public.refresh_tokens WHERE user_id = $1 AND (revoked_at IS NOT NULL OR expires_at < NOW())",
        [user.id]
      ).catch(err => console.error('Failed to prune old refresh tokens:', err));

      setAuthCookies(res, accessToken, refreshToken);

      // 5. Determine canonical destination (shared with GET /api/users/me so a page
      // refresh mid-session redirects the same way a fresh login would).
      const destination = getDestination(user);

      // 6. Return user info only — the session itself now lives in the cookies set above.
      res.json({
        user: {
          id:                user.id,
          name:              user.name,
          email:             user.email,
          role:              user.role,
          department:        user.department || '',
          mustChangePassword: user.must_change_password,
          destination,
        }
      });

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  });

  // /api/auth/identify
  app.post('/api/auth/identify', async (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!pool) {
      return res.status(500).json({ error: 'Database is not configured.' });
    }

    try {
      const words = name.trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        return res.status(400).json({ error: 'Name is required' });
      }

      let query = 'SELECT id, name, email, role, department FROM public.users WHERE ';
      const conditions: string[] = [];
      const params: any[] = [];

      words.forEach((word) => {
        const lower = word.toLowerCase();
        if (['mohammed', 'mohammad', 'muhammad', 'mohamed', 'mohamad'].includes(lower)) {
          conditions.push("(name ILIKE '%mohammad%' OR name ILIKE '%mohammed%' OR name ILIKE '%muhammad%' OR name ILIKE '%mohamed%' OR name ILIKE '%mohamad%')");
        } else {
          params.push(`%${word}%`);
          conditions.push(`name ILIKE $${params.length}`);
        }
      });

      params.push(`${name.trim()}%`);
      const emailParamIndex = params.length;

      const nameConditionsStr = conditions.join(' AND ');
      query += `(${nameConditionsStr}) OR email ILIKE $${emailParamIndex} LIMIT 1`;

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = result.rows[0];
      
      // Determine RoleKey for AI Hero
      let roleKey = 'dev';
      if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'ops') roleKey = 'leadership';
      else if (user.department?.toLowerCase().includes('design')) roleKey = 'design';
      else if (user.department?.toLowerCase().includes('video')) roleKey = 'video';
      else if (user.department?.toLowerCase().includes('marketing')) roleKey = 'marketing';
      else if (user.department?.toLowerCase().includes('sales')) roleKey = 'sales';

      let designation = user.department || user.role;
      if (user.email === 'sushilathithiyaa@invictusglobaltech.com') {
        designation = 'CEO';
      } else if (user.email === 'contact@invictusglobaltech.com') {
        designation = 'COO';
      } else if (user.email === 'connect@invictusglobaltech.com') {
        designation = 'Operations Manager';
      } else if (designation === 'performance_marketing') {
        designation = 'Performance Marketing';
      } else if (designation === 'development') {
        designation = 'Development';
      } else if (designation === 'video') {
        designation = 'Video Editing';
      } else if (designation === 'design') {
        designation = 'Design';
      }

      res.json({
        success: true,
        data: {
          firstName: user.name.split(' ')[0],
          roleKey,
          designation,
          email: user.email,
        }
      });
    } catch (err) {
      console.error('/api/auth/identify error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Test connection
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Error connecting to database:', err);
    } else {
      console.log('Database connected successfully at:', res.rows[0].now);
    }
  });
} else {
  console.log('Warning: DATABASE_URL not set in env variables. Database queries will not function.');
}

// Simple health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    databaseConnected: pool !== null,
  });
});

// Example route
app.get('/api/data', async (req: Request, res: Response) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured.' });
  }

  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ message: 'Success', serverTime: result.rows[0].now });
  } catch (error: any) {
    console.error('Query error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mount Loop 1 API routes
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/time-logs', timeLogsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/github', requireAuth, requirePageAccess('/development', ['admin', 'ops']), githubDataRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/auth/instagram', instagramAuthRoutes);
app.use('/api/auth/youtube', youtubeAuthRoutes);
app.use('/api/social', requireAuth, requirePageAccess('/social', ['admin', 'ops']), socialSyncRoutes);
app.use('/api/agency-metrics', agencyMetricsRoutes);
app.use('/api/page-access', pageAccessRoutes);
app.use('/api/architecture-docs', architectureDocsRoutes);
app.use('/api/audit-log', auditLogRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/google', googleAuthRoutes);
app.use('/api/app-secrets', appSecretsRoutes);

// Public — no auth required (login page hero)
app.get('/api/ai/login-hero-public', async (req: Request, res: Response) => {
  const roleKey = (req.query.roleKey as string) || 'leadership';
  const today = new Date();
  const dateKey = today.toISOString().split('T')[0];
  const cacheKey = `${dateKey}_${roleKey}`;

  if (heroCache.has(cacheKey)) {
    return res.json({ success: true, data: heroCache.get(cacheKey)!, error: null });
  }

  const day = today.toLocaleDateString('en-IN', { weekday: 'long' });
  const date = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 380,
        temperature: 0.85,
        messages: [
          { role: 'system', content: 'Generate role-specific daily content for IGT OS. Return only valid JSON.' },
          { role: 'user', content: buildPrompt(roleKey, day, date) },
        ],
      }),
    });

    const data: any = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

    heroCache.set(cacheKey, parsed);
    return res.json({ success: true, data: parsed, error: null });
  } catch (err) {
    return res.json({ success: true, data: fallbacks[roleKey] || fallbacks.leadership, error: null });
  }
});

// Private - auth required
app.use('/api/ai/login-hero', requireAuth, loginHeroRoute);


app.post('/api/leave-requests', requireAuth, async (req: Request, res: Response) => {
  const { type, fromDate, toDate, reason, requestedByName } = req.body;

  if (!type || !fromDate || !toDate || !reason) {
    return res.status(400).json({
      success: false, data: null,
      error: 'Leave type, dates, and reason are required.',
    });
  }

  if (!pool) {
    console.log('[leave] No DB:', { type, fromDate, toDate, requestedByName });
    return res.json({ success: true, data: { message: 'Leave request logged.' }, error: null });
  }

  try {
    await pool.query(
      `INSERT INTO leave_requests
         (user_id, user_name, type, from_date, to_date, reason, reporting_manager, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',NOW())`,
      [
        (req as any).user?.id,
        requestedByName || 'Unknown',
        type, fromDate, toDate, reason,
        'Abhilash B Nair',
      ]
    );

    // The request itself was previously stored with nobody ever informed — no notification,
    // no email, nothing. Every leave request now notifies exactly Abhilash B Nair (103, Ops
    // Manager), Anitha Yogan (102, COO), and Sushil Athithiyaa (101, CEO) — not the broader
    // admin/ops role set, which would also sweep in people like the CTO who isn't part of the
    // leave-approval chain. The submitter is excluded so nobody gets notified of their own request.
    const submitterId = (req as any).user?.id;
    const LEAVE_NOTIFY_IDS = ['101', '102', '103'];
    pool.query(
      `INSERT INTO public.notifications (user_id, actor_id, type, message)
       SELECT id, $1, 'status_change', $2 FROM public.users WHERE id = ANY($3) AND id != $1`,
      [submitterId, `${requestedByName || 'Someone'} requested ${type} leave from ${fromDate} to ${toDate}: "${reason}"`, LEAVE_NOTIFY_IDS]
    ).catch(err => console.error('[leave] Failed to create notification:', err));

    logAudit(pool, {
      actorId: submitterId,
      actorName: requestedByName || 'Unknown',
      action: 'leave_requested',
      entity: 'Leave',
      entityRef: `${type} leave (${fromDate} to ${toDate})`,
      meta: { type, fromDate, toDate, reason },
    });

    return res.json({ success: true, data: { message: 'Leave request submitted.' }, error: null });
  } catch (err: any) {
    console.error('[leave] DB error:', err.message);
    return res.json({ success: true, data: { message: 'Leave request logged.' }, error: null });
  }
});

// GET /api/leave-requests/me — the caller's own submitted requests, for showing a real
// "leave taken this month" figure on My Profile instead of a static, always-zero field.
app.get('/api/leave-requests/me', requireAuth, async (req: Request, res: Response) => {
  if (!pool) return res.json([]);
  try {
    const result = await pool.query(
      `SELECT id, type, from_date, to_date, reason, status, created_at
       FROM leave_requests WHERE user_id = $1 ORDER BY created_at DESC`,
      [(req as any).user.id]
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error('[leave] Error fetching own leave requests:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
