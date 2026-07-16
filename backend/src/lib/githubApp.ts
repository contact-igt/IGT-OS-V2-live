import jwt from 'jsonwebtoken';

// Generates a short-lived JWT identifying the GitHub App itself (not an installation),
// used only to exchange for an installation access token below.
function generateAppJwt(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60, // issued 60s ago to allow clock drift
    exp: now + 10 * 60, // expires in 10 minutes
    iss: appId,
  };
  return jwt.sign(payload, privateKey.replace(/\\n/g, '\n'), { algorithm: 'RS256' });
}

export async function getInstallationAccessToken(): Promise<string> {
  const appId = process.env.GITHUB_APP_ID;
  const installationId = process.env.GITHUB_INSTALLATION_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY;

  if (!appId || !installationId || !privateKey) {
    throw new Error('GitHub App credentials missing (GITHUB_APP_ID/GITHUB_INSTALLATION_ID/GITHUB_PRIVATE_KEY)');
  }

  const appJwt = generateAppJwt(appId, privateKey);

  const res = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${appJwt}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'igt-backend',
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch Installation Access Token: ${errText}`);
  }

  const data = await res.json() as any;
  return data.token;
}
