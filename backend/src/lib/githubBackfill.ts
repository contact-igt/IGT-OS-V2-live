import { Pool } from 'pg';
import { getInstallationAccessToken } from './githubApp';

// GitHub resolves a commit's `author.login` by matching the commit's git email to a known
// GitHub account. When that email isn't verified/linked to any account, GitHub falls back
// to attributing the commit to whatever generic/bot identity made the API push (here,
// the org's own `contact-igt` account) — even though the raw git commit metadata
// (`commit.author.name`) often still has the real person's actual GitHub username, since
// that's commonly what people set as their local git user.name. Preferring the raw name
// whenever GitHub's own resolution lands on the generic bot account recovers real
// attribution GitHub itself couldn't make.
const GENERIC_BOT_USERNAME = 'contact-igt';

async function githubFetch(token: string, url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'igt-backend' },
  });
  if (!res.ok) throw new Error(`GitHub API ${url} returned ${res.status}`);
  return res.json();
}

async function backfillRepoCommits(pool: Pool, token: string, repoId: string, owner: string, name: string, maxPages = 5): Promise<number> {
  let inserted = 0;
  for (let page = 1; page <= maxPages; page++) {
    const commits = await githubFetch(token, `https://api.github.com/repos/${owner}/${name}/commits?per_page=100&page=${page}`);
    if (!Array.isArray(commits) || commits.length === 0) break;

    for (const c of commits) {
      const login = c.author?.login;
      const rawName = c.commit?.author?.name;
      const authorUsername = (login && login !== GENERIC_BOT_USERNAME) ? login : (rawName || login || 'unknown');
      const committedAt = c.commit?.author?.date || c.commit?.committer?.date;
      if (!c.sha || !committedAt) continue;

      const result = await pool.query(
        `INSERT INTO public.github_commits (repo_id, sha, author_github_username, message, committed_at, additions, deletions, files_changed)
         VALUES ($1, $2, $3, $4, $5, 0, 0, 0)
         ON CONFLICT (sha) DO UPDATE SET author_github_username = EXCLUDED.author_github_username
           WHERE public.github_commits.author_github_username = $6 AND EXCLUDED.author_github_username != $6
         RETURNING (xmax = 0) AS is_new_row`,
        [repoId, c.sha, authorUsername, c.commit?.message || '(no message)', committedAt, GENERIC_BOT_USERNAME]
      );
      if (result.rows[0]?.is_new_row) inserted++;
    }

    if (commits.length < 100) break;
  }
  return inserted;
}

async function backfillRepoPRs(pool: Pool, token: string, repoId: string, owner: string, name: string, maxPages = 3): Promise<number> {
  let inserted = 0;
  for (let page = 1; page <= maxPages; page++) {
    const prs = await githubFetch(token, `https://api.github.com/repos/${owner}/${name}/pulls?state=all&per_page=100&page=${page}`);
    if (!Array.isArray(prs) || prs.length === 0) break;

    for (const pr of prs) {
      const existing = await pool.query(
        'SELECT id FROM public.github_pull_requests WHERE repo_id = $1 AND pr_number = $2',
        [repoId, pr.number]
      );
      if (existing.rows.length > 0) continue;

      let authorUserId: string | null = null;
      if (pr.user?.login) {
        const u = await pool.query('SELECT id FROM public.users WHERE github_username = $1', [pr.user.login]);
        authorUserId = u.rows[0]?.id || null;
      }

      await pool.query(
        `INSERT INTO public.github_pull_requests
           (repo_id, pr_number, title, author_user_id, opened_at, merged_at, closed_at, status, additions, deletions, commits_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0, 0)`,
        [repoId, pr.number, pr.title, authorUserId, pr.created_at, pr.merged_at, pr.closed_at, pr.state]
      );
      inserted++;
    }

    if (prs.length < 100) break;
  }
  return inserted;
}

export interface BackfillSummary {
  reposProcessed: number;
  commitsInserted: number;
  prsInserted: number;
  errors: string[];
}

// One-time historical catch-up for every tracked repo — the webhook only captures pushes
// that happen while it's live, so anything before that (or missed) never otherwise arrives.
export async function backfillAllRepos(pool: Pool): Promise<BackfillSummary> {
  const token = await getInstallationAccessToken();
  const defaultOwner = process.env.GITHUB_ORG || 'contact-igt';
  const repos = await pool.query('SELECT id, repo_name FROM public.github_repos WHERE is_tracked = true');

  let commitsInserted = 0;
  let prsInserted = 0;
  const errors: string[] = [];

  for (const repo of repos.rows) {
    const [owner, name] = repo.repo_name.includes('/') ? repo.repo_name.split('/') : [defaultOwner, repo.repo_name];
    try {
      commitsInserted += await backfillRepoCommits(pool, token, repo.id, owner, name);
      prsInserted += await backfillRepoPRs(pool, token, repo.id, owner, name);
    } catch (err: any) {
      errors.push(`${repo.repo_name}: ${err.message}`);
    }
  }

  return { reposProcessed: repos.rows.length, commitsInserted, prsInserted, errors };
}
