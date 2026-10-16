// Client helper for the Next.js AI routes: attaches a short-lived backend-issued ticket.
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
let cached: { ticket: string; expiresAt: number } | null = null;

async function getTicket(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 15_000) return cached.ticket;
  const res = await fetch(`${baseUrl}/api/auth/ai-ticket`, { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new Error('Please sign in again to use AI features.');
  const { ticket, expiresInSec } = await res.json();
  cached = { ticket, expiresAt: Date.now() + expiresInSec * 1000 };
  return ticket;
}

export async function aiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${await getTicket()}`);
  return fetch(path, { ...init, headers });
}
