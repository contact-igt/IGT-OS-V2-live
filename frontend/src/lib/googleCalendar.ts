export interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  htmlLink?: string;
  attendees?: { email: string; responseStatus?: string }[];
  meetLink?: string;
}

// Routed through our own backend (which holds the real Google access token server-side)
// instead of calling googleapis.com directly from the browser — the browser never sees a
// Google access token, and our own session travels via the HttpOnly auth cookie.
export async function fetchGoogleCalendarEvents(isAuthenticated: boolean, timeMin: string, timeMax: string): Promise<{ events: GoogleEvent[]; connected: boolean }> {
  if (!isAuthenticated) return { events: [], connected: false };

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const params = new URLSearchParams({ start: timeMin, end: timeMax });

    // no-store: without this, the browser can serve a cached response for this exact
    // URL+date-range from a PREVIOUS user's session on the same tab/device, silently
    // showing one employee's calendar under another's login.
    const res = await fetch(`${baseUrl}/api/google/calendar/events?${params.toString()}`, {
      credentials: 'include',
      cache: 'no-store',
    });

    if (res.status === 404) {
      // No Google account connected yet — show an honest empty state, not fabricated events.
      return { events: [], connected: false };
    }
    if (!res.ok) throw new Error('Failed to fetch Google Calendar events');

    const items = await res.json();
    return {
      events: items.map((item: any) => ({
        id: item.id,
        summary: item.summary,
        description: item.description,
        start: item.start,
        end: item.end,
        htmlLink: item.htmlLink,
        attendees: item.attendees,
        meetLink: item.hangoutLink,
      })),
      connected: true,
    };
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return { events: [], connected: false };
  }
}
