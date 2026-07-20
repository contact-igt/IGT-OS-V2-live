// A fixed pool of quotes with a deterministic daily pick — same quote all day for everyone,
// changes automatically at midnight with no server call or external API needed.
const MOTIVATIONAL_QUOTES: string[] = [
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
];

export function getDailyQuote(date: Date = new Date()): string {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const index = dayOfYear % MOTIVATIONAL_QUOTES.length;
  return MOTIVATIONAL_QUOTES[index];
}
