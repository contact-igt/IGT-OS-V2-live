// Server-only helper for Next.js API routes to resolve an admin-managed secret (e.g. an
// OpenAI key pasted into the Credentials page) at request time, instead of only ever
// reading a static env var that requires a redeploy to change. Falls back to the given
// env var whenever there's no DB override or the backend call fails, so this never makes
// things worse than the plain env-var-only behavior it replaces.
export async function getServerSecret(keyName: string, envFallback?: string): Promise<string | null> {
  const internalSecret = process.env.INTERNAL_API_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  if (internalSecret) {
    try {
      const res = await fetch(`${baseUrl}/api/app-secrets/internal/${keyName}`, {
        headers: { 'x-internal-secret': internalSecret },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.value) return data.value;
      }
    } catch (err) {
      console.error(`[serverSecrets] Failed to resolve ${keyName} from backend:`, err);
    }
  }

  return envFallback || null;
}
