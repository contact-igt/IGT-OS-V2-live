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

export async function fetchGoogleCalendarEvents(accessToken: string, timeMin: string, timeMax: string): Promise<GoogleEvent[]> {
  // If no token or running in local dev without real keys, return mock data
  if (!accessToken || accessToken === 'mock_token') {
    return getMockEvents(timeMin);
  }

  try {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.append('timeMin', timeMin);
    url.searchParams.append('timeMax', timeMax);
    url.searchParams.append('singleEvents', 'true');
    url.searchParams.append('orderBy', 'startTime');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      throw new Error('Failed to fetch Google Calendar events');
    }

    const data = await res.json();
    return data.items.map((item: any) => ({
      id: item.id,
      summary: item.summary,
      description: item.description,
      start: item.start,
      end: item.end,
      htmlLink: item.htmlLink,
      attendees: item.attendees,
      meetLink: item.hangoutLink
    }));
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return getMockEvents(timeMin); // Fallback to mock data on error
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
