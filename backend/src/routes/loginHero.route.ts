import { Router, Request, Response } from 'express';

const router = Router();

interface HeroContent {
  headline_white: string;
  headline_green: string;
  subtitle: string;
  dashboard_message: string;
}

// Daily cache per role — 6 entries max, auto-stale next day
export const heroCache = new Map<string, HeroContent>();

// ── ROLE KEY RESOLVER ──────────────────────────────────────────────────────
export function resolveRoleKey(role: string, department: string): string {
  if (role === 'admin' || role === 'super_admin') return 'leadership';
  const d = (department || '').toLowerCase();
  if (d.includes('design') || d.includes('creative'))      return 'design';
  if (d.includes('tech') || d.includes('dev') || d.includes('ai')) return 'dev';
  if (d.includes('marketing') || d.includes('performance')) return 'marketing';
  if (d.includes('video'))                                  return 'video';
  if (d.includes('sales') || d.includes('bde'))             return 'sales';
  if (role === 'ops')                                       return 'leadership';
  return 'leadership';
}

// ── ROLE BLOCKS ────────────────────────────────────────────────────────────
export const ROLE_BLOCKS: Record<string, string> = {
  leadership: `
VIEWER: CEO / COO / Head of Operations
WHO: Sushil (CEO), Anitha Yogan (COO), Abhilash B Nair (Operations Manager)

These three are accountable for everything — revenue, team performance, client relationships,
payroll, delivery quality, and the ₹1Cr profit goal by December 2026.
Their morning begins with the big picture: what's tracking, what's at risk, what needs a decision.

Tone: Strategic and grounding. Like a founder who wrote this to themselves at 6am.
Reference: Revenue, pipeline, team health, client retention, financial targets, leadership decisions.
NEVER sound like generic motivation. Sound like real accountability.
Example GOOD headline: "Lead today." + "The rest follows."
Example GOOD headline: "The numbers reflect" + "what you decide now."
Example BAD headline: "Your agency, fully in control." ← too generic, never use this`,

  design: `
VIEWER: Creative Head / Designer
WHO: Karan K — the ONLY designer for all of IGT's 14+ clients

Karan produces every creative — social posts, reels thumbnails, ad visuals, presentations,
brand assets — for healthcare clinics, fitness brands, real estate companies, and schools.
His work is the visual face of every brand IGT manages. One creative from him today
could be what a patient first sees before booking with a hospital.

Tone: Craft-proud, impact-aware, quality-obsessed. Like a creative director who knows
that design is not decoration — it is the decision a customer makes.
Reference: Visuals, brand perception, client creatives, the impact of a single well-made image.
The headline should feel like it was written for someone who lives in Figma and Illustrator.
Example GOOD headline: "Your design" + "fills waiting rooms."
Example GOOD headline: "One creative." + "Real impact."
Example BAD headline: "Your agency, fully in control." ← NEVER produce this for a designer`,

  dev: `
VIEWER: Developer / AI Developer
WHO: Iyyappan (AI Developer building WhatsNexus SaaS), Veeravel S (Web Dev), Naveen Raj (DevOps)

Iyyappan is building WhatsNexus — IGT's own WhatsApp marketing SaaS product — while handling
client dev work. Veeravel and Naveen build and maintain client websites. These are the builders.
Every feature Iyyappan ships moves WhatsNexus closer to MRR. Every site Veeravel deploys
is a client's digital presence live in the world.

Tone: Builder energy. Ship-focused. The quiet pride of something working in production.
Reference: Shipping code, WhatsNexus SaaS, solving problems through automation, client websites,
building things that last. SaaS = solving real business problems at scale.
Example GOOD headline: "Build something" + "permanent today."
Example GOOD headline: "Code that ships." + "Problems that disappear."
Example BAD headline: "Your agency, fully in control." ← NEVER produce this for a developer`,

  marketing: `
VIEWER: Performance Marketer
WHO: Aiswarya Saiju (Meta Ads), Anju S (Meta Ads), Rutuja (Google Ads Lead)

These three manage all paid performance campaigns — Meta and Google — for healthcare,
fitness, real estate, and edtech clients. Their morning starts with campaign dashboards.
Every rupee must return qualified leads. Their work is why hospitals get appointment bookings,
gyms get consultation requests, and real estate projects get site visit inquiries.

Tone: Performance-obsessed. Data-grounded but aware of the human impact behind every metric.
Reference: ROAS, CPL, campaigns, ad budgets, Meta/Google, qualified leads, campaign optimization.
The headline should feel like a campaign brief — tight, results-focused, numbers-driven.
Example GOOD headline: "Every rupee" + "must earn its place."
Example GOOD headline: "Campaigns run." + "Results don't lie."
Example BAD headline: "Your agency, fully in control." ← NEVER produce this for marketers`,

  video: `
VIEWER: Video Editor
WHO: Basheer (Chief Video Editor, IGT's quality benchmark), Pranesh Krishnan (Video Editor)

Basheer sets the production standard for the entire agency. Pranesh manages his own
client output independently. They turn raw footage into healthcare brand stories — reels,
ad films, corporate videos, social content. The edit Basheer completes today will be the
first video impression a patient has of a hospital, or a student has of a school.

Tone: Storyteller's pride. Craft-first. The finality and weight of the final cut.
Reference: The edit, the frame, production quality, storytelling, delivery, client brand films.
The headline should feel like a filmmaker's morning brief — not an agency slogan.
Example GOOD headline: "One great edit." + "That's all it takes."
Example GOOD headline: "The frame you choose" + "tells the whole story."
Example BAD headline: "Your agency, fully in control." ← NEVER produce this for video editors`,

  sales: `
VIEWER: Business Development Executive
WHO: Tania Viquar (BDE / Sales)

Tania is the growth engine of IGT. She finds new clients — hospitals, clinics, schools,
gyms, real estate firms — and converts them into retainers. Pipeline, outreach, follow-ups,
proposals, demos, closures — that is her entire world. Every new client that joins IGT
comes through her. The agency's revenue growth in the next 6 months depends on her pipeline.

Tone: Sales floor energy. Opportunity-hunter. Persistent. Every morning is a new chance to close.
Reference: Pipeline, follow-ups, closures, new clients, retainers, outreach, business development.
The headline should feel like a sales manager's morning rally — not an agency-wide message.
Example GOOD headline: "Deals don't close" + "themselves."
Example GOOD headline: "Close one today." + "The pipeline is yours."
Example BAD headline: "Your agency, fully in control." ← NEVER produce this for sales`,
};

// ── PROMPT BUILDER ─────────────────────────────────────────────────────────
export function buildPrompt(roleKey: string, day: string, date: string): string {
  const dayEnergy: Record<string, string> = {
    Monday:    'New week. Set the tone. Start strong and set the trajectory.',
    Tuesday:   'Deep execution day. This is where the real work happens.',
    Wednesday: 'Mid-week. Don\'t lose the momentum. Keep pushing.',
    Thursday:  'Build toward the close. Thursday outcomes define the week.',
    Friday:    'Deliver everything. Ship. Celebrate what got done.',
    Saturday:  'The hustle others skip. IGT shows up anyway.',
    Sunday:    'Reflect. Plan. Come back Monday sharper than you left.',
  };

  return `You are the daily content engine for IGT OS — the internal operating system of Invictus Global Tech Pvt. Ltd.

ABOUT INVICTUS GLOBAL TECH:
- Performance marketing agency in Urapakkam, Chennai, India
- We grow brands across healthcare, edtech, and real estate
- Expanding into SaaS and automation — WhatsNexus is IGT's own WhatsApp marketing platform
- 14-person team: led by Sushil (CEO) and Anitha Yogan (COO)
- Active clients: Pixel Eye Hospital, Phoenix Fitness, Namokar Eye, Rio Hospital, Aarav Eye Care, Optimus Eye, Antardrashti, Sahasraa High School, VLS Law Academy
- Services: Meta + Google performance marketing, social media, video, creative design, web dev, WhatsApp automation
- Financial goal: ₹1 Crore net profit by December 31, 2026
- Core belief: We solve real problems. Every campaign fills a hospital. Every website launches a brand. Every SaaS feature replaces a manual process.

\${ROLE_BLOCKS[roleKey]}

TODAY IS: \${day}, \${date}
Day energy: \${dayEnergy[day] || 'Make it count.'}

YOUR TASK:
Generate a HEADLINE (two lines), SUBTITLE, and DASHBOARD_MESSAGE for the viewer above.

OUTPUT RULES — READ CAREFULLY:

1. HEADLINE_WHITE (2–4 words): Opens the statement. Strong. Declarative.
2. HEADLINE_GREEN (2–4 words): The payoff. Punchy. Memorable.
   Together they form ONE complete thought that could ONLY be shown to this specific role.
   If you read the headline and think "this could be for any job at any company" — it's wrong. Rewrite it.

3. SUBTITLE (14–20 words):
   Written from inside IGT. Specific to this role's actual work.
   Reference what this person actually does — not what the agency does as a whole.
   Rotate across: campaigns, creatives, deals, builds, edits, leads — whatever is real for this role.

4. DASHBOARD_MESSAGE (max 28 words):
   This appears under "Good morning, [Name]." on their personal dashboard.
   Must feel like a direct message to that specific person.
   Practical + motivating. Not generic. Not applicable to any other role.

ABSOLUTE FORBIDDEN:
- "Your agency, fully in control." — never produce this. It is a placeholder, not a message.
- Any headline that works for all 6 roles equally — that means it's generic
- "teamwork makes the dream work", "believe in yourself", "you've got this", "let's go"
- Anything that sounds like a motivational poster

TONE: Warm, grounded, agency-proud. Authentic Indian voice. Real — like a colleague wrote it.
The team should read it and think: "Yes. That is exactly what today is about for me."

Return ONLY this JSON — nothing else, no markdown:
{"headline_white":"...","headline_green":"...","subtitle":"...","dashboard_message":"..."}`;
}

export const fallbacks: Record<string, HeroContent> = {
  leadership: { headline_white: 'Lead today.',         headline_green: 'The rest follows.',       subtitle: 'Revenue, team health, and client retention — every number this week starts with a decision you make today.', dashboard_message: "Three client reviews due this week. The agency's direction is yours to set." },
  design:     { headline_white: 'Your design',         headline_green: 'fills waiting rooms.',    subtitle: 'One creative you finish today will be the first impression a patient has of a brand that trusted IGT.', dashboard_message: "Client creatives in queue. Design like someone's decision depends on it — because it does." },
  dev:        { headline_white: 'Build something',     headline_green: 'permanent today.',        subtitle: 'Every line you push is WhatsNexus growing or a client site working — both are part of what IGT owns.', dashboard_message: "WhatsNexus feature queue is open. What you ship today stays in production." },
  marketing:  { headline_white: 'Every rupee',         headline_green: 'must earn its place.',    subtitle: 'The campaign you optimize today could send qualified leads to a hospital that needs every single one of them.', dashboard_message: "Check your CPAs before standup. Your campaign data is the truth the whole team sees this week." },
  video:      { headline_white: 'One great edit.',     headline_green: "That's all it takes.",   subtitle: 'The reel you deliver today is the first thing a patient, gym member, or student will ever see of that brand.', dashboard_message: "Reels in queue. Deliver the way clients remember — on time, no compromise on craft." },
  sales:      { headline_white: "Deals don't close",  headline_green: 'themselves.',             subtitle: "Every follow-up you send today is a retainer conversation — the agency's next six months run through your pipeline.", dashboard_message: "Make three meaningful connections before noon. Your pipeline is what the whole agency's growth depends on." },
};

// ── ROUTE HANDLER ──────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  const user       = (req as any).user;
  const roleKey    = resolveRoleKey(user?.role || 'team', user?.department || '');
  const today      = new Date();
  const dateKey    = today.toISOString().split('T')[0];
  const cacheKey   = `${dateKey}_${roleKey}`;

  if (heroCache.has(cacheKey)) {
    return res.json({ success: true, data: heroCache.get(cacheKey)!, error: null });
  }

  const day  = today.toLocaleDateString('en-IN', { weekday: 'long' });
  const date = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 380,
        temperature: 0.85,
        messages: [
          { role: 'system', content: 'Generate role-specific daily content for IGT OS. Return only valid JSON.' },
          { role: 'user', content: buildPrompt(roleKey, day, date) },
        ],
      }),
    });

    const data: any = await response.json();
    const raw     = data.choices?.[0]?.message?.content || '';
    const parsed: HeroContent = JSON.parse(raw.replace(/```json|```/g, '').trim());

    heroCache.set(cacheKey, parsed);
    return res.json({ success: true, data: parsed, error: null });

  } catch (err) {
    return res.json({ success: true, data: fallbacks[roleKey] || fallbacks.leadership, error: null });
  }
});

export default router;
