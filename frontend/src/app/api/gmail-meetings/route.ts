// Proxies to the backend's real Gmail integration (backend/src/routes/googleAuth.ts,
// GET /api/google/gmail/meeting-recaps) — that's where the per-user Google OAuth tokens
// live. This route just forwards the caller's auth token and passes the response through,
// so the frontend component (GmailImportModal) needs no changes.
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const res = await fetch(`${baseUrl}/api/google/gmail/meeting-recaps`, {
      headers: { Authorization: authHeader },
    });

    if (res.status === 404) {
      // No Google account connected yet — an empty list reads as "nothing found" in the
      // modal instead of surfacing a scary error for something that just isn't set up yet.
      return NextResponse.json([]);
    }
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch Gmail recaps' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
