import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../middleware/auth';
import { postMeetingSummaryAlert } from '../lib/googleChat';

const router = Router();

function serializeMeeting(row: any) {
  return {
    id: row.id,
    title: row.title,
    clientId: row.client_id,
    createdBy: row.created_by,
    transcriptSnippet: row.transcript_snippet,
    analysisPreference: row.analysis_preference,
    result: row.result,
    tasksCreated: row.tasks_created || [],
    googleEventId: row.google_event_id,
    createdAt: row.created_at,
  };
}

// GET /api/meetings — newest first, for the "Recent Meeting Intelligence" panel
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const result = await pool.query('SELECT * FROM public.meetings ORDER BY created_at DESC LIMIT 200');
    res.json(result.rows.map(serializeMeeting));
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/meetings/:id — for the /ai/meeting/[id] detail page
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const result = await pool.query('SELECT * FROM public.meetings WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });
    res.json(serializeMeeting(result.rows[0]));
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/meetings — persist a completed analysis. actor is always the caller.
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const { title, clientId, transcriptSnippet, analysisPreference, result } = req.body;
  if (!title || !result) {
    return res.status(400).json({ error: 'title and result are required' });
  }

  try {
    const insertResult = await pool.query(
      `INSERT INTO public.meetings (title, client_id, created_by, transcript_snippet, analysis_preference, result)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, clientId || null, req.user.id, transcriptSnippet || null, analysisPreference || null, result]
    );

    // Fire-and-forget, same non-blocking convention attendance.ts uses for its Chat alert —
    // a slow/down webhook should never delay the API response.
    postMeetingSummaryAlert({ title, summary: result?.summary, actionItems: result?.actionItems })
      .catch(err => console.error('Failed to post meeting summary to Google Chat:', err));

    res.status(201).json(serializeMeeting(insertResult.rows[0]));
  } catch (error) {
    console.error('Error saving meeting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/meetings/:id/tasks-created — append real task ids once meeting-derived tasks
// are actually created in Postgres, so a re-analysis can dedup against them.
router.patch('/:id/tasks-created', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const { taskIds } = req.body;
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return res.status(400).json({ error: 'taskIds must be a non-empty array' });
  }

  try {
    const result = await pool.query(
      `UPDATE public.meetings
       SET tasks_created = (SELECT ARRAY(SELECT DISTINCT unnest(tasks_created || $1::uuid[])))
       WHERE id = $2
       RETURNING *`,
      [taskIds, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });
    res.json(serializeMeeting(result.rows[0]));
  } catch (error) {
    console.error('Error updating meeting tasks-created:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
