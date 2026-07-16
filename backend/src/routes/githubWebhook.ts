import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import crypto from 'crypto';

const router = Router();
const TASK_CODE_REGEX = /TSK-\d+/;

// NOTE: this router is mounted in index.ts BEFORE the global express.json() middleware
// (with express.raw() applied at the mount point), so req.body here is a raw Buffer —
// required for HMAC signature verification against the exact bytes GitHub signed.
function verifySignature(req: Request): boolean {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature || typeof signature !== 'string') return false;

  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error('GITHUB_WEBHOOK_SECRET is not defined.');
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(req.body).digest('hex');

  const sigBuffer = Buffer.from(signature);
  const digestBuffer = Buffer.from(digest);
  if (sigBuffer.length !== digestBuffer.length) return false;
  return crypto.timingSafeEqual(sigBuffer, digestBuffer);
}

async function getOrCreateRepo(pool: Pool, fullName: string, repoId?: string) {
  const existing = await pool.query('SELECT * FROM public.github_repos WHERE repo_name = $1', [fullName]);
  if (existing.rows.length > 0) return existing.rows[0];

  let installation = await pool.query(
    'SELECT * FROM public.github_installations WHERE github_org = $1',
    [process.env.GITHUB_ORG || 'unknown']
  );
  if (installation.rows.length === 0) {
    installation = await pool.query(
      'INSERT INTO public.github_installations (github_org, is_active) VALUES ($1, true) RETURNING *',
      [process.env.GITHUB_ORG || 'unknown']
    );
  }

  const id = repoId || fullName; // fall back to repo_name as id if GitHub's numeric id isn't known here
  const created = await pool.query(
    `INSERT INTO public.github_repos (id, installation_id, repo_name, is_tracked)
     VALUES ($1, $2, $3, true) RETURNING *`,
    [id, installation.rows[0].id, fullName]
  );
  return created.rows[0];
}

async function resolveUserByGithubUsername(pool: Pool, username: string | null | undefined): Promise<string | null> {
  if (!username) return null;
  const result = await pool.query('SELECT id FROM public.users WHERE github_username = $1', [username]);
  return result.rows[0]?.id || null;
}

function extractTaskCode(text: string | null | undefined): string | null {
  const match = text?.match(TASK_CODE_REGEX);
  return match ? match[0] : null;
}

async function resolveTaskIdByCode(pool: Pool, code: string | null | undefined): Promise<string | null> {
  if (!code) return null;
  const result = await pool.query('SELECT id FROM public.tasks WHERE display_code = $1', [code]);
  return result.rows[0]?.id || null;
}

async function handlePushEvent(pool: Pool, payload: any) {
  const repo = await getOrCreateRepo(pool, payload.repository.full_name, String(payload.repository.id));
  const commits = payload.commits || [];

  for (const commit of commits) {
    const authorUsername = commit.author?.username || commit.author?.name || 'unknown';
    const authorUserId = await resolveUserByGithubUsername(pool, authorUsername);
    const taskCode = extractTaskCode(commit.message) || extractTaskCode(payload.ref);
    const linkedTaskId = await resolveTaskIdByCode(pool, taskCode);

    await pool.query(
      `INSERT INTO public.github_commits
        (repo_id, sha, author_github_username, author_user_id, message, committed_at, additions, deletions, files_changed, linked_task_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (sha) DO NOTHING`,
      [
        repo.id, commit.id, authorUsername, authorUserId, commit.message, new Date(commit.timestamp),
        commit.added?.length || 0, commit.removed?.length || 0,
        (commit.added?.length || 0) + (commit.removed?.length || 0) + (commit.modified?.length || 0),
        linkedTaskId,
      ]
    );
  }

  console.log(`Push: wrote ${commits.length} commit(s) for ${repo.repo_name}`);
}

async function handlePullRequestEvent(pool: Pool, payload: any) {
  const repo = await getOrCreateRepo(pool, payload.repository.full_name, String(payload.repository.id));
  const pr = payload.pull_request;
  const authorUserId = await resolveUserByGithubUsername(pool, pr.user?.login);
  const taskCode = extractTaskCode(pr.title) || extractTaskCode(pr.head?.ref);
  const linkedTaskId = await resolveTaskIdByCode(pool, taskCode);

  let status = 'open';
  if (pr.merged) status = 'merged';
  else if (pr.state === 'closed') status = 'closed';

  await pool.query(
    `INSERT INTO public.github_pull_requests
      (repo_id, pr_number, title, author_user_id, opened_at, merged_at, closed_at, status, additions, deletions, commits_count, linked_task_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (repo_id, pr_number) DO UPDATE SET
       title = EXCLUDED.title, merged_at = EXCLUDED.merged_at, closed_at = EXCLUDED.closed_at,
       status = EXCLUDED.status, additions = EXCLUDED.additions, deletions = EXCLUDED.deletions,
       commits_count = EXCLUDED.commits_count, linked_task_id = EXCLUDED.linked_task_id`,
    [
      repo.id, pr.number, pr.title, authorUserId, new Date(pr.created_at),
      pr.merged_at ? new Date(pr.merged_at) : null, pr.closed_at ? new Date(pr.closed_at) : null,
      status, pr.additions || 0, pr.deletions || 0, pr.commits || 0, linkedTaskId,
    ]
  );

  console.log(`PR event: ${payload.action} - #${pr.number} (${status})`);
}

async function handlePullRequestReviewEvent(pool: Pool, payload: any) {
  const repo = await getOrCreateRepo(pool, payload.repository.full_name, String(payload.repository.id));
  const pr = payload.pull_request;
  const review = payload.review;

  const prRow = await pool.query(
    'SELECT id FROM public.github_pull_requests WHERE repo_id = $1 AND pr_number = $2',
    [repo.id, pr.number]
  );
  if (prRow.rows.length === 0) {
    console.warn(`Review event for untracked PR #${pr.number} — skipping`);
    return;
  }

  const reviewerUserId = await resolveUserByGithubUsername(pool, review.user?.login);

  await pool.query(
    `INSERT INTO public.github_reviews (pr_id, reviewer_user_id, state, submitted_at)
     VALUES ($1, $2, $3, $4)`,
    [prRow.rows[0].id, reviewerUserId, review.state, new Date(review.submitted_at)]
  );

  console.log(`Review: ${review.state} on PR #${pr.number}`);
}

async function handleDeploymentStatusEvent(pool: Pool, payload: any) {
  const repo = await getOrCreateRepo(pool, payload.repository.full_name, String(payload.repository.id));
  const deployment = payload.deployment;
  const status = payload.deployment_status;
  const deployedByUserId = await resolveUserByGithubUsername(pool, deployment.creator?.login);

  await pool.query(
    `INSERT INTO public.github_deployments (repo_id, environment, deployed_by, deployed_at, status)
     VALUES ($1, $2, $3, $4, $5)`,
    [repo.id, deployment.environment, deployedByUserId, new Date(status.created_at), status.state]
  );

  console.log(`Deployment: ${status.state} on ${deployment.environment}`);
}

router.post('/', async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  if (!verifySignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const payload = JSON.parse(req.body.toString('utf8'));
  const eventType = req.headers['x-github-event'];

  try {
    switch (eventType) {
      case 'push':
        await handlePushEvent(pool, payload);
        break;
      case 'pull_request':
        await handlePullRequestEvent(pool, payload);
        break;
      case 'pull_request_review':
        await handlePullRequestReviewEvent(pool, payload);
        break;
      case 'deployment_status':
        await handleDeploymentStatusEvent(pool, payload);
        break;
      default:
        break;
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error(`Error handling GitHub event ${eventType}:`, err);
    return res.status(200).json({ received: true, error: 'processing_failed' });
  }
});

export default router;
