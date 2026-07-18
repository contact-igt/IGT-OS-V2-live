import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../middleware/auth';
import { postAttendanceAlert } from '../lib/googleChat';

const router = Router();

const BREAK_BUFFER_MINUTES = 60;

function serializeAttendance(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    clockIn: row.clock_in,
    clockOut: row.clock_out,
    status: row.status,
    lateReturn: row.late_return,
  };
}

// POST /clock-in — starts a new session for today. If the user is already clocked in
// (an open session exists), this is a no-op that just returns that open session. Otherwise
// a new session is created; if a previous session today was closed more than
// BREAK_BUFFER_MINUTES ago, this new session is flagged lateReturn so it shows up in attendance.
router.post('/clock-in', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const openSession = await pool.query(
      `SELECT * FROM public.attendance_logs WHERE user_id = $1 AND date = CURRENT_DATE AND clock_out IS NULL`,
      [req.user.id]
    );
    if (openSession.rows.length > 0) {
      return res.json(serializeAttendance(openSession.rows[0]));
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

    res.status(201).json(serializeAttendance(result.rows[0]));
  } catch (error: any) {
    console.error('Error clocking in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /clock-out — only updates a still-open entry for today; early clock-out (9am-6pm)
// triggers a best-effort in-app notification + Google Chat alert, neither of which can
// fail the clock-out itself.
router.post('/clock-out', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const result = await pool.query(
      `UPDATE public.attendance_logs
       SET clock_out = NOW()
       WHERE user_id = $1 AND date = CURRENT_DATE AND clock_out IS NULL
       RETURNING *`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No open attendance entry found for today' });
    }

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
    }

    res.json(serializeAttendance(result.rows[0]));
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
    const days = Math.min(Number(req.query.days) || 30, 365);
    const result = await pool.query(
      `SELECT * FROM public.attendance_logs
       WHERE user_id = $1 AND date >= CURRENT_DATE - $2::int
       ORDER BY date DESC, clock_in DESC`,
      [req.user.id, days]
    );
    res.json(result.rows.map(serializeAttendance));
  } catch (error: any) {
    console.error('Error fetching own attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / — all attendance for admin/ops, own-only otherwise (same role split as GET /api/tasks)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { role, id } = req.user;
    const days = Math.min(Number(req.query.days) || 30, 365);

    let query = '';
    let params: any[] = [];

    if (role === 'admin' || role === 'ops') {
      query = `SELECT * FROM public.attendance_logs WHERE date >= CURRENT_DATE - $1::int ORDER BY date DESC, clock_in DESC`;
      params = [days];
    } else {
      query = `SELECT * FROM public.attendance_logs WHERE user_id = $1 AND date >= CURRENT_DATE - $2::int ORDER BY date DESC, clock_in DESC`;
      params = [id, days];
    }

    const result = await pool.query(query, params);
    res.json(result.rows.map(serializeAttendance));
  } catch (error: any) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
