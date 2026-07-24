// Posts to a Discord channel via an incoming webhook — same one-way, channel-only model
// as googleChat.ts (no DMs; posts under the webhook's own configured name/avatar, not a
// real person). No-ops (with a warning) until the relevant env var is set, so callers
// never need to guard against it being missing.

export async function postAttendanceAlertDiscord(message: string): Promise<void> {
  const webhookUrl = process.env.ATTENDANCE_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[discord] ATTENDANCE_WEBHOOK_URL not configured, skipping alert:', message);
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message }),
    });
    if (!res.ok) {
      console.error('[discord] Webhook responded with', res.status, await res.text());
    }
  } catch (error: any) {
    console.error('[discord] Failed to post attendance alert:', error);
  }
}

// Discord embeds render as a card (title/description/fields/color), a closer match to the
// Google Chat meeting-summary card than a plain content string would be.
export async function postMeetingSummaryAlertDiscord(meeting: { title: string; summary?: string; actionItems?: { title: string }[] }): Promise<void> {
  const webhookUrl = process.env.MEETINGS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[discord] MEETINGS_WEBHOOK_URL not configured, skipping meeting summary alert:', meeting.title);
    return;
  }

  const topActions = (meeting.actionItems || []).slice(0, 3).map(a => `• ${a.title}`).join('\n');

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: meeting.title,
          description: meeting.summary || undefined,
          color: 0x2AB182, // matches the app's primary green
          fields: topActions ? [{ name: 'Top Action Items', value: topActions }] : [],
        }],
      }),
    });
    if (!res.ok) {
      console.error('[discord] Webhook responded with', res.status, await res.text());
    }
  } catch (error: any) {
    console.error('[discord] Failed to post meeting summary alert:', error);
  }
}
