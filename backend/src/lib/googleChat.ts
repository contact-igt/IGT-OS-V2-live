// Posts a message to a Google Chat Space via an incoming webhook. Access control for who
// sees the message is handled entirely by Space membership on the Google Chat side — this
// just posts to whichever single webhook URL is configured. No-ops (with a warning) until
// GOOGLE_CHAT_WEBHOOK_URL is set, so callers never need to guard against it being missing.
export async function postAttendanceAlert(message: string): Promise<void> {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[googleChat] GOOGLE_CHAT_WEBHOOK_URL not configured, skipping alert:', message);
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
    if (!res.ok) {
      console.error('[googleChat] Webhook responded with', res.status, await res.text());
    }
  } catch (error: any) {
    console.error('[googleChat] Failed to post attendance alert:', error);
  }
}

// Posts a summary card to a separate, dedicated "Meeting Summaries" Space — kept apart from
// attendance alerts (different webhook, GOOGLE_CHAT_MEETINGS_WEBHOOK_URL) so the two kinds
// of notification don't compete for attention in the same channel.
export async function postMeetingSummaryAlert(meeting: { title: string; summary?: string; actionItems?: { title: string }[] }): Promise<void> {
  const webhookUrl = process.env.GOOGLE_CHAT_MEETINGS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[googleChat] GOOGLE_CHAT_MEETINGS_WEBHOOK_URL not configured, skipping meeting summary alert:', meeting.title);
    return;
  }

  const topActions = (meeting.actionItems || []).slice(0, 3).map(a => `• ${a.title}`).join('\n');
  const lines = [
    `📝 *${meeting.title}*`,
    meeting.summary || '',
    topActions ? `\n*Top action items:*\n${topActions}` : '',
  ].filter(Boolean);

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: lines.join('\n') }),
    });
    if (!res.ok) {
      console.error('[googleChat] Webhook responded with', res.status, await res.text());
    }
  } catch (error: any) {
    console.error('[googleChat] Failed to post meeting summary alert:', error);
  }
}
