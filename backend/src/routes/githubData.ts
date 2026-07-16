import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../middleware/auth';
import { getInstallationAccessToken } from '../lib/githubApp';

const router = Router();

// Sync GitHub repositories the App is installed on into public.github_repos
async function syncGithubRepos(pool: Pool): Promise<void> {
  const githubOrg = process.env.GITHUB_ORG || 'contact-igt';

  if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_INSTALLATION_ID || !process.env.GITHUB_PRIVATE_KEY) {
    console.log('GitHub App credentials missing in backend environment variables. Skipping sync.');
    return;
  }

  try {
    const token = await getInstallationAccessToken();

    // GitHub's installation/repositories endpoint defaults to 30 per page and caps at
    // 100 — loop pages until a short page tells us we've hit the end.
    const remoteRepos: any[] = [];
    let page = 1;
    while (true) {
      const res = await fetch(
        `https://api.github.com/installation/repositories?per_page=100&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'igt-backend',
          },
        }
      );
      if (!res.ok) throw new Error(`GitHub installation/repositories API returned ${res.status}`);
      const data = await res.json() as any;
      const pageRepos = data.repositories || [];
      remoteRepos.push(...pageRepos);
      if (pageRepos.length < 100) break;
      page++;
    }

    let installation = await pool.query(
      'SELECT * FROM public.github_installations WHERE github_org = $1',
      [githubOrg]
    );
    if (installation.rows.length === 0) {
      installation = await pool.query(
        'INSERT INTO public.github_installations (github_org, is_active) VALUES ($1, true) RETURNING *',
        [githubOrg]
      );
    }

    for (const repo of remoteRepos) {
      const existing = await pool.query('SELECT id FROM public.github_repos WHERE repo_name = $1', [repo.full_name]);
      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO public.github_repos (id, installation_id, repo_name, is_tracked) VALUES ($1, $2, $3, true)`,
          [String(repo.id), installation.rows[0].id, repo.full_name]
        );
      }
    }
    console.log(`Synced ${remoteRepos.length} repositories from GitHub App.`);
  } catch (error) {
    console.error('Error syncing repositories from GitHub App:', error);
  }
}

router.get('/live', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    await syncGithubRepos(pool);

    const reposResult = await pool.query('SELECT * FROM public.github_repos');
    const commitsResult = await pool.query(
      'SELECT * FROM public.github_commits ORDER BY committed_at DESC LIMIT 200'
    );
    const prsResult = await pool.query(
      'SELECT * FROM public.github_pull_requests ORDER BY opened_at DESC LIMIT 200'
    );

    const repos = reposResult.rows.map((repo: any) => {
      const [owner, name] = repo.repo_name.includes('/') ? repo.repo_name.split('/') : ['unknown', repo.repo_name];
      return { id: repo.id, name, owner, openIssues: 0 }; // GitHub App has no Issues permission granted
    });

    // Unlike the reference project's /api/github/live, additions/deletions/authorUserId
    // are included here — they're already in the DB, no reason to drop them.
    const commits = commitsResult.rows.map((c: any) => {
      const repo = reposResult.rows.find((r: any) => r.id === c.repo_id);
      const name = repo ? (repo.repo_name.includes('/') ? repo.repo_name.split('/')[1] : repo.repo_name) : 'unknown';
      return {
        id: c.sha,
        repo: name,
        authorName: c.author_github_username,
        authorUserId: c.author_user_id,
        message: c.message,
        timestamp: c.committed_at.toISOString(),
        additions: c.additions,
        deletions: c.deletions,
        filesChanged: c.files_changed,
        linkedTaskId: c.linked_task_id,
      };
    });

    const pullRequests = prsResult.rows.map((pr: any) => {
      const repo = reposResult.rows.find((r: any) => r.id === pr.repo_id);
      const name = repo ? (repo.repo_name.includes('/') ? repo.repo_name.split('/')[1] : repo.repo_name) : 'unknown';
      return {
        repo: name,
        state: pr.status,
        number: pr.pr_number,
        title: pr.title,
        authorUserId: pr.author_user_id,
        additions: pr.additions,
        deletions: pr.deletions,
      };
    });

    res.status(200).json({ repos, commits, pullRequests });
  } catch (err) {
    console.error('Error fetching GitHub live data:', err);
    res.status(500).json({ error: 'Failed to fetch GitHub data' });
  }
});

export default router;
