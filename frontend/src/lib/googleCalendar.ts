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
// Google access token now. `token` here is this app's own auth JWT, not a Google token.
export async function fetchGoogleCalendarEvents(token: string | null, timeMin: string, timeMax: string): Promise<{ events: GoogleEvent[]; connected: boolean }> {
  if (!token) return { events: getMockEvents(timeMin), connected: false };

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const params = new URLSearchParams({ start: timeMin, end: timeMax });

    // no-store: without this, the browser can serve a cached response for this exact
    // URL+date-range from a PREVIOUS user's session on the same tab/device, silently
    // showing one employee's calendar under another's login.
    const res = await fetch(`${baseUrl}/api/google/calendar/events?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (res.status === 404) {
      // No Google account connected yet — fall back to mock data rather than an empty page.
      return { events: getMockEvents(timeMin), connected: false };
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
    return { events: getMockEvents(timeMin), connected: false };
  }
}

function getMockEvents(baseDateIso: string): GoogleEvent[] {
  const base = new Date(baseDateIso);
  // Create an event for today
  const today = new Date();

  const m1Start = new Date(today);
  m1Start.setHours(10, 0, 0, 0);
  const m1End = new Date(today);
  m1End.setHours(11, 0, 0, 0);

  const m2Start = new Date(today);
  m2Start.setHours(14, 30, 0, 0);
  const m2End = new Date(today);
  m2End.setHours(15, 30, 0, 0);

  return [
    {
      id: 'mock-evt-1',
      summary: 'Weekly Sync with HAGGLE',
      description: 'Discuss Q3 marketing roadmap and deliverables.',
      start: { dateTime: m1Start.toISOString() },
      end: { dateTime: m1End.toISOString() },
      meetLink: 'https://meet.google.com/abc-defg-hij',
      attendees: [{ email: 'client@haggle.com' }, { email: 'sushil@invictus.com' }]
    },
    {
      id: 'mock-evt-2',
      summary: 'Internal Team Standup',
      start: { dateTime: m2Start.toISOString() },
      end: { dateTime: m2End.toISOString() },
      meetLink: 'https://meet.google.com/xyz-uvwx-qrs'
    }
  ];
}
