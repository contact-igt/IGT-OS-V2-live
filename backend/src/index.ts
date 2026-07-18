import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
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
import loginHeroRoute, { heroCache, buildPrompt, fallbacks, resolveRoleKey } from './routes/loginHero.route';
import { requireAuth, requirePageAccess } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Setup CORS and JSON parsing
app.use(cors());
// Must be mounted BEFORE express.json() below — the webhook needs the raw request
// body (as Express received it) to verify GitHub's HMAC signature; once express.json()
// has parsed it, the original bytes are gone.
app.use('/api/webhooks/github', express.raw({ type: 'application/json' }), githubWebhookRoutes);
app.use(express.json());

// Initialize PG Pool if DATABASE_URL is available
let pool: Pool | null = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  app.locals.pool = pool;
  
  const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';

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
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const user = result.rows[0];

      // 1.5. Check if active
      if (!user.is_active) {
        return res.status(403).json({ error: 'Account is disabled. Please contact admin.' });
      }

      // 1.6. Check if locked out
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
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
          return res.status(423).json({ error: 'Account locked due to multiple failed attempts. Try again later.' });
        } else {
          await pool.query(
            "UPDATE public.users SET failed_login_attempts = $1 WHERE id = $2",
            [newAttempts, user.id]
          );
          return res.status(401).json({ error: 'Invalid email or password.' });
        }
      }

      // 3. Password is correct, reset lockout counters
      await pool.query(
        "UPDATE public.users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1",
        [user.id]
      );

      // 4. Generate JWT Token
      const token = jwt.sign(
        {
          id:         user.id,
          email:      user.email,
          role:       user.role,
          department: user.department || '',
          name:       user.name       || '',
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // 5. Determine Canonical Destination
      let destination = '/my-workspace';
      if (user.role === 'admin') {
        destination = '/dashboard';
      } else if (user.role === 'ops') {
        if (user.department?.toLowerCase() === 'finance') {
          destination = '/dashboard/finance';
        } else if (user.email === 'contact@invictusglobaltech.com') {
          destination = '/dashboard/coo';
        } else {
          destination = '/dashboard/ops';
        }
      } else {
        destination = '/my-workspace';
      }

      if (user.must_change_password) {
        destination = '/set-password';
      }

      // 6. Return user info and session token
      res.json({
        token,
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
      // Fuzzy case-insensitive match on name or email prefix
      const result = await pool.query(
        'SELECT id, name, email, role, department FROM public.users WHERE name ILIKE $1 OR email ILIKE $2 LIMIT 1',
        [`%${name}%`, `${name}%`]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = result.rows[0];
      
      // Determine RoleKey for AI Hero
      let roleKey = 'dev';
      if (user.role === 'admin' || user.role === 'ops') roleKey = 'leadership';
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
app.use('/api/auth/instagram', instagramAuthRoutes);
app.use('/api/auth/youtube', youtubeAuthRoutes);
app.use('/api/social', requireAuth, requirePageAccess('/social', ['admin', 'ops']), socialSyncRoutes);
app.use('/api/agency-metrics', agencyMetricsRoutes);
app.use('/api/page-access', pageAccessRoutes);

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
    return res.json({ success: true, data: { message: 'Leave request submitted.' }, error: null });
  } catch (err: any) {
    console.error('[leave] DB error:', err.message);
    return res.json({ success: true, data: { message: 'Leave request logged.' }, error: null });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
