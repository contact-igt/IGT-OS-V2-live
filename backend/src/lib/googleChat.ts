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

// Posts to the Web Development Space (webhook saved as IGT_OS, not GOOGLE_CHAT_* — Google
// Chat's own naming validation rejected the more descriptive names used for the other two
// webhooks above) whenever a task is assigned to at least one Development-department member.
export async function postDevTaskAssignmentAlert(
  task: { title: string; priority: string; deadline?: string | null; clientName?: string },
  assigneeNames: string[]
): Promise<void> {
  const webhookUrl = process.env.IGT_OS;
  if (!webhookUrl) {
    console.warn('[googleChat] IGT_OS webhook not configured, skipping dev task alert:', task.title);
    return;
  }

  const deadlineStr = task.deadline
    ? new Date(task.deadline).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
    : 'No deadline';
  const lines = [
    `🆕 *New task assigned:* ${task.title}`,
    `*Priority:* ${task.priority.toUpperCase()}`,
    task.clientName ? `*Client:* ${task.clientName}` : '',
    `*Assigned to:* ${assigneeNames.join(', ')}`,
    `*Deadline:* ${deadlineStr}`,
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
    console.error('[googleChat] Failed to post dev task assignment alert:', error);
  }
}
