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

// Which Google Chat Space each department's task-assignment alerts go to. Add a department
// here (plus its env var) to give that team its own channel — nothing else needs changing.
//
// Named GCHAT_* rather than GOOGLE_CHAT_* to match the variables configured on the host.
// Development previously read from IGT_OS, which had drifted to holding an OpenAI API key
// instead of a webhook URL — every dev alert was failing silently as a result.
const DEPARTMENT_WEBHOOK_ENV: Record<string, string> = {
  development: 'GCHAT_DEV_WEBHOOK_URL',
  design: 'GCHAT_DESIGN_WEBHOOK_URL',
};

export const ALERTING_DEPARTMENTS = Object.keys(DEPARTMENT_WEBHOOK_ENV);

// Announces a task assignment in the given department's Space. Silently no-ops (with a
// warning) when that department has no webhook configured, so adding a department to the
// map above before its URL exists is harmless.
export async function postDepartmentTaskAssignmentAlert(
  department: string,
  task: { title: string; priority: string; deadline?: string | null; clientName?: string },
  assigneeNames: string[]
): Promise<void> {
  const envVar = DEPARTMENT_WEBHOOK_ENV[department];
  if (!envVar) return;

  const webhookUrl = process.env[envVar];
  if (!webhookUrl) {
    console.warn(`[googleChat] ${envVar} not configured, skipping ${department} task alert:`, task.title);
    return;
  }
  // Guards against the value having drifted to something that isn't a webhook at all (an API
  // key was sitting in this slot at one point, and every alert failed silently as an opaque
  // fetch error). Says plainly what's wrong instead of leaving it to be noticed months later.
  if (!/^https:\/\/chat\.googleapis\.com\//.test(webhookUrl)) {
    console.error(
      `[googleChat] ${envVar} does not look like a Google Chat webhook URL ` +
      `(expected it to start with https://chat.googleapis.com/). Skipping the ${department} alert — ` +
      `check that this variable holds the Space's webhook URL and not some other secret.`
    );
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
    console.error(`[googleChat] Failed to post ${department} task assignment alert:`, error);
  }
}
