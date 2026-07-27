// Every OAuth integration here builds its callback URL from BACKEND_URL. When that env var
// is missing the template literal silently produces the string "undefined/api/...", which
// the provider rejects with an opaque 400 — the failure looks like a broken integration
// rather than a missing environment variable, which is exactly how it went unnoticed in
// production. Fail loudly and specifically instead.
export function buildRedirectUri(path: string): string {
  const base = process.env.BACKEND_URL;
  if (!base) {
    throw new Error(
      `BACKEND_URL is not configured — cannot build the OAuth redirect URI for ${path}. ` +
      `Set BACKEND_URL to this server's public origin (e.g. https://api.example.com), and make ` +
      `sure "<BACKEND_URL>${path}" is registered as an authorized redirect URI with the provider.`
    );
  }
  return `${base.replace(/\/+$/, '')}${path}`;
}
