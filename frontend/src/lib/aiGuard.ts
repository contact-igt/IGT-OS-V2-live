// Server-only: gates the Next.js AI routes. The browser sends a short-lived AI ticket
// (see lib/aiFetch.ts); we confirm it with the backend, which also rate-limits per user.
import { NextRequest, NextResponse } from 'next/server';

export async function requireAiUser(req: NextRequest | Request): Promise<NextResponse | null> {
  const ticket = req.headers.get('authorization');
  if (!ticket) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${baseUrl}/api/auth/ai-ticket/verify`, {
      headers: { Authorization: ticket },
      cache: 'no-store',
    });
    if (res.ok) return null;
    const body = await res.json().catch(() => ({}));
    return NextResponse.json({ error: body.error || 'Unauthorized' }, { status: res.status === 429 ? 429 : 401 });
  } catch {
    // Fail closed: if auth cannot be confirmed, do not spend provider credits.
    return NextResponse.json({ error: 'Auth service unavailable' }, { status: 503 });
  }
}
