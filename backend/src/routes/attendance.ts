import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../middleware/auth';
import { postAttendanceAlert } from '../lib/googleChat';
import { postAttendanceAlertDiscord } from '../lib/discord';

const router = Router();

const BREAK_BUFFER_MINUTES = 60;

// Auto-close any unclosed sessions from previous days (Gap 3 Fix)
async function autoCloseStaleSessions(pool: Pool) {
  try {
    await pool.query(
      `UPDATE public.attendance_logs
       SET clock_out = LEAST(NOW(), clock_in + INTERVAL '8 hours'), status = 'auto_closed'
       WHERE clock_out IS NULL AND (date < CURRENT_DATE OR clock_in < NOW() - INTERVAL '16 hours')`
    );
  } catch (err) {
    console.error('Error auto-closing stale attendance sessions:', err);
  }
}

function serializeAttendance(row: any, breaks: any[] = []) {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    clockIn: row.clock_in,
    clockOut: row.clock_out,
    status: row.status,
    lateReturn: row.late_return,
    breaks: breaks.map((b: any) => ({
      id: b.id,
      breakStart: b.break_start,
      breakEnd: b.break_end,
    })),
    isOnBreak: breaks.some((b: any) => !b.break_end),
  };
}

// GET /active-session — returns current user's open clock-in session and break status
router.get('/active-session', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    await autoCloseStaleSessions(pool);

    const openSession = await pool.query(
      `SELECT * FROM public.attendance_logs WHERE user_id = $1 AND date = CURRENT_DATE AND clock_out IS NULL`,
      [req.user.id]
    );

    if (openSession.rows.length === 0) {
      return res.json({ activeSession: null });
    }

    const session = openSession.rows[0];
    const breaks = await pool.query(
      `SELECT * FROM public.attendance_breaks WHERE attendance_id = $1 ORDER BY break_start ASC`,
      [session.id]
    );

    res.json({
      activeSession: serializeAttendance(session, breaks.rows),
    });
  } catch (error: any) {
    console.error('Error fetching active session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /clock-in — starts a new session for today.
router.post('/clock-in', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    await autoCloseStaleSessions(pool);

    const openSession = await pool.query(
      `SELECT * FROM public.attendance_logs WHERE user_id = $1 AND date = CURRENT_DATE AND clock_out IS NULL`,
      [req.user.id]
    );
    if (openSession.rows.length > 0) {
      const session = openSession.rows[0];
      const breaks = await pool.query(
        `SELECT * FROM public.attendance_breaks WHERE attendance_id = $1 ORDER BY break_start ASC`,
        [session.id]
      );
      return res.json(serializeAttendance(session, breaks.rows));
    }

    const lastSession = await pool.query(
      `SELECT * FROM public.attendance_logs WHERE user_id = $1 AND date = CURRENT_DATE
       ORDER BY clock_in DESC LIMIT 1`,
      [req.user.id]
    );

    const isFirstSessionToday = lastSession.rows.length === 0;
    const status = isFirstSessionToday && new Date().getHours() >= 10 ? 'late' : 'present';

    let lateReturn = false;
    if (!isFirstSessionToday && lastSession.rows[0].clock_out) {
      const minutesSinceClockOut = (Date.now() - new Date(lastSession.rows[0].clock_out).getTime()) / 60000;
      lateReturn = minutesSinceClockOut > BREAK_BUFFER_MINUTES;
    }

    const result = await pool.query(
      `INSERT INTO public.attendance_logs (user_id, date, clock_in, status, late_return)
       VALUES ($1, CURRENT_DATE, NOW(), $2, $3)
       RETURNING *`,
      [req.user.id, status, lateReturn]
    );

    res.status(201).json(serializeAttendance(result.rows[0], []));
  } catch (error: any) {
    console.error('Error clocking in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /break-start — starts a break for the active session (Gap 2 Fix)
router.post('/break-start', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const openSession = await pool.query(
      `SELECT * FROM public.attendance_logs WHERE user_id = $1 AND date = CURRENT_DATE AND clock_out IS NULL`,
      [req.user.id]
    );

    if (openSession.rows.length === 0) {
      return res.status(400).json({ error: 'No active clock-in session found to start break' });
    }

    const session = openSession.rows[0];

    // Check if break already open
    const openBreak = await pool.query(
      `SELECT * FROM public.attendance_breaks WHERE attendance_id = $1 AND break_end IS NULL`,
      [session.id]
    );

    if (openBreak.rows.length === 0) {
      await pool.query(
        `INSERT INTO public.attendance_breaks (attendance_id, user_id, break_start)
         VALUES ($1, $2, NOW())`,
        [session.id, req.user.id]
      );
    }

    const breaks = await pool.query(
      `SELECT * FROM public.attendance_breaks WHERE attendance_id = $1 ORDER BY break_start ASC`,
      [session.id]
    );

    res.json(serializeAttendance(session, breaks.rows));
  } catch (error: any) {
    console.error('Error starting break:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /break-end — ends an active break (Gap 2 Fix)
router.post('/break-end', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const openSession = await pool.query(
      `SELECT * FROM public.attendance_logs WHERE user_id = $1 AND date = CURRENT_DATE AND clock_out IS NULL`,
      [req.user.id]
    );

    if (openSession.rows.length === 0) {
      return res.status(400).json({ error: 'No active clock-in session found' });
    }

    const session = openSession.rows[0];

    await pool.query(
      `UPDATE public.attendance_breaks
       SET break_end = NOW()
       WHERE attendance_id = $1 AND break_end IS NULL`,
      [session.id]
    );

    const breaks = await pool.query(
      `SELECT * FROM public.attendance_breaks WHERE attendance_id = $1 ORDER BY break_start ASC`,
      [session.id]
    );

    res.json(serializeAttendance(session, breaks.rows));
  } catch (error: any) {
    console.error('Error ending break:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /clock-out — closes the active entry for today
router.post('/clock-out', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const openSession = await pool.query(
      `SELECT * FROM public.attendance_logs WHERE user_id = $1 AND date = CURRENT_DATE AND clock_out IS NULL`,
      [req.user.id]
    );

    if (openSession.rows.length === 0) {
      return res.status(404).json({ error: 'No open attendance entry found for today' });
    }

    const session = openSession.rows[0];

    // Close any open break automatically when clocking out
    await pool.query(
      `UPDATE public.attendance_breaks
       SET break_end = NOW()
       WHERE attendance_id = $1 AND break_end IS NULL`,
      [session.id]
    );

    const result = await pool.query(
      `UPDATE public.attendance_logs
       SET clock_out = NOW()
       WHERE id = $1
       RETURNING *`,
      [session.id]
    );

    const breaks = await pool.query(
      `SELECT * FROM public.attendance_breaks WHERE attendance_id = $1 ORDER BY break_start ASC`,
      [session.id]
    );

    const hour = new Date().getHours();
    if (hour >= 9 && hour < 18) {
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const message = `⚠️ ${req.user.name} clocked out at ${timeStr} — before 6 PM.`;

      pool.query(
        `INSERT INTO public.notifications (user_id, actor_id, type, message)
         VALUES ($1, $1, 'status_change', $2)`,
        [req.user.id, 'Warning: You have been clocked out before 6 PM.']
      ).catch(err => console.error('Error creating early-clockout notification:', err));

      postAttendanceAlert(message).catch(err => console.error('Error posting attendance alert:', err));
      postAttendanceAlertDiscord(message).catch(err => console.error('Error posting Discord attendance alert:', err));
    }

    res.json(serializeAttendance(result.rows[0], breaks.rows));
  } catch (error: any) {
    console.error('Error clocking out:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /me — the logged-in user's own attendance history
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    await autoCloseStaleSessions(pool);
    const days = Math.min(Number(req.query.days) || 30, 365);
    const result = await pool.query(
      `SELECT * FROM public.attendance_logs
       WHERE user_id = $1 AND date >= CURRENT_DATE - $2::int
       ORDER BY date DESC, clock_in DESC`,
      [req.user.id, days]
    );
    res.json(result.rows.map(row => serializeAttendance(row)));
  } catch (error: any) {
    console.error('Error fetching own attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / — all attendance for admin/ops, own-only otherwise
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    await autoCloseStaleSessions(pool);
    const { role, id } = req.user;
    const days = Math.min(Number(req.query.days) || 30, 365);

    let query = '';
    let params: any[] = [];

    if (role === 'admin' || role === 'super_admin' || role === 'ops') {
      query = `SELECT * FROM public.attendance_logs WHERE date >= CURRENT_DATE - $1::int ORDER BY date DESC, clock_in DESC`;
      params = [days];
    } else {
      query = `SELECT * FROM public.attendance_logs WHERE user_id = $1 AND date >= CURRENT_DATE - $2::int ORDER BY date DESC, clock_in DESC`;
      params = [id, days];
    }

    const result = await pool.query(query, params);
    res.json(result.rows.map(row => serializeAttendance(row)));
  } catch (error: any) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
