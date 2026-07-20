import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

function serializeDoc(row: any) {
  return {
    docType: row.doc_type,
    filename: row.filename,
    uploadedBy: row.uploaded_by,
    updatedAt: row.updated_at,
  };
}

// GET /api/architecture-docs — metadata only (no content) for both doc slots, for anyone logged in
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const result = await pool.query('SELECT * FROM public.architecture_docs');
    const byType: Record<string, any> = {};
    for (const row of result.rows) byType[row.doc_type] = serializeDoc(row);
    res.json(byType);
  } catch (error) {
    console.error('Error fetching architecture docs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/architecture-docs/:docType/download — raw markdown content as a file attachment
router.get('/:docType/download', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const { docType } = req.params;
  if (docType !== 'frontend' && docType !== 'backend') {
    return res.status(400).json({ error: 'docType must be frontend or backend' });
  }

  try {
    const result = await pool.query('SELECT * FROM public.architecture_docs WHERE doc_type = $1', [docType]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'No document uploaded yet' });

    const row = result.rows[0];
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${row.filename}"`);
    res.send(row.content);
  } catch (error) {
    console.error('Error downloading architecture doc:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/architecture-docs/:docType — admin-only upload/replace
router.put('/:docType', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const { docType } = req.params;
  if (docType !== 'frontend' && docType !== 'backend') {
    return res.status(400).json({ error: 'docType must be frontend or backend' });
  }

  const { filename, content } = req.body;
  if (!filename || typeof content !== 'string') {
    return res.status(400).json({ error: 'filename and content are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO public.architecture_docs (doc_type, filename, content, uploaded_by, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (doc_type) DO UPDATE SET
         filename = EXCLUDED.filename, content = EXCLUDED.content,
         uploaded_by = EXCLUDED.uploaded_by, updated_at = now()
       RETURNING *`,
      [docType, filename, content, req.user.id]
    );
    res.json(serializeDoc(result.rows[0]));
  } catch (error) {
    console.error('Error uploading architecture doc:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/architecture-docs/:docType — admin-only
router.delete('/:docType', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const { docType } = req.params;
  if (docType !== 'frontend' && docType !== 'backend') {
    return res.status(400).json({ error: 'docType must be frontend or backend' });
  }

  try {
    await pool.query('DELETE FROM public.architecture_docs WHERE doc_type = $1', [docType]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting architecture doc:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
