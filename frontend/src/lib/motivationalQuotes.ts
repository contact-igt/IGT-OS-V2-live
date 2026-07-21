import type { RoleTag } from '@/lib/data';

// A curated pool of quotes per job-function role tag, plus a generic fallback pool for
// roles that aren't mapped. Picked deterministically by day-of-year within the role's own
// pool — same quote all day for everyone in that role, changes automatically at midnight,
// no server call or external API needed.
const ROLE_QUOTES: Record<RoleTag | 'default', string[]> = {
  developer: [
    "Code is read more often than it's written — make today's commits count.",
    "Ship small, ship often, ship working code.",
    "The best debugging tool is still careful thinking.",
    "Every bug fixed today is a bug someone doesn't hit tomorrow.",
    "Clean code always looks like it was written by someone who cares.",
    "Refactor with purpose, not for its own sake.",
    "A good commit message is a gift to your future self.",
  ],
  web_developer: [
    "Code is read more often than it's written — make today's commits count.",
    "Ship small, ship often, ship working code.",
    "Fast, accessible, and correct — pick all three.",
    "Every bug fixed today is a bug someone doesn't hit tomorrow.",
    "A good commit message is a gift to your future self.",
    "Build it so it still makes sense six months from now.",
  ],
  ai_developer: [
    "Code is read more often than it's written — make today's commits count.",
    "The model is only as good as the problem you framed.",
    "Ship small, ship often, ship working code.",
    "Every experiment that fails cleanly teaches you something real.",
    "Measure twice, train once.",
  ],
  designer: [
    "Design is how it works, not just how it looks.",
    "Good design is invisible until it's missing.",
    "Iterate fast, but never skip the details that matter.",
    "Simplicity is the ultimate sophistication.",
    "Every pixel is a decision — make it on purpose.",
    "The best design gets out of the user's way.",
  ],
  video_editor: [
    "The cut you don't notice is the cut that worked.",
    "Pace is the difference between a good edit and a great one.",
    "Every frame should earn its place in the timeline.",
    "Tell the story first, polish the shine second.",
    "Consistency in tone builds trust with the viewer.",
  ],
  performance_marketer: [
    "Test everything, assume nothing.",
    "A campaign that isn't measured isn't finished.",
    "Small optimizations compound into big wins.",
    "The best creative is the one that keeps performing.",
    "Data tells you what happened; judgment tells you what to do next.",
  ],
  sales: [
    "Every conversation is a chance to earn trust, not just close a deal.",
    "Follow up today — momentum fades fast in a pipeline.",
    "Listen twice as much as you pitch.",
    "The best sales pitch is a problem well understood.",
    "Consistency in outreach beats intensity in bursts.",
  ],
  ops: [
    "Smooth operations are invisible — that's the point.",
    "A process documented today saves an hour tomorrow.",
    "Small process improvements add up to big efficiency.",
    "The best operations work is the fire nobody had to fight.",
    "Consistency beats intensity.",
  ],
  leadership: [
    "Clarity is the kindest thing a leader can offer their team.",
    "Your team's best work starts with your best listening.",
    "Set the direction, then get out of the way.",
    "The strength of the team is each individual member — support them today.",
    "Great leaders make the path easier to see, not just to follow.",
  ],
  default: [
    "Small steps every day lead to big results.",
    "Discipline is choosing between what you want now and what you want most.",
    "Progress, not perfection.",
    "Focus on being productive instead of busy.",
    "The secret of getting ahead is getting started.",
    "Do something today that your future self will thank you for.",
    "Consistency beats intensity.",
    "Great things are done by a series of small things brought together.",
    "You don't have to be great to start, but you have to start to be great.",
    "Action is the foundational key to all success.",
    "A little progress each day adds up to big results.",
    "The best way to predict the future is to create it.",
    "Success is the sum of small efforts repeated day in and day out.",
    "Don't watch the clock; do what it does — keep going.",
    "Your only limit is you.",
    "Push yourself, because no one else is going to do it for you.",
    "Dream big, work hard, stay focused.",
    "It always seems impossible until it's done.",
    "Quality is not an act, it is a habit.",
    "Believe you can, and you're halfway there.",
    "Slow progress is still progress.",
    "Excellence is not a skill, it's an attitude.",
    "Make today count.",
    "The harder you work for something, the greater you'll feel when you achieve it.",
    "Don't wait for opportunity, create it.",
    "Every accomplishment starts with the decision to try.",
    "What you do today can improve all your tomorrows.",
    "Stay focused and never give up.",
    "Difficult roads often lead to beautiful destinations.",
    "Hard work beats talent when talent doesn't work hard.",
    "The only way to do great work is to love what you do.",
    "Well done is better than well said.",
    "Energy and persistence conquer all things.",
    "Start where you are. Use what you have. Do what you can.",
    "Success usually comes to those who are too busy to be looking for it.",
    "The future depends on what you do today.",
    "Never let a day go by without doing something productive.",
    "A goal without a plan is just a wish.",
    "Focus on progress, not perfection.",
    "Winners are not people who never fail, but people who never quit.",
  ],
};

export function getDailyQuote(roleTag?: string | null, date: Date = new Date()): string {
  const pool = ROLE_QUOTES[(roleTag as RoleTag) ?? ''] || ROLE_QUOTES.default;
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const index = dayOfYear % pool.length;
  return pool[index];
}
