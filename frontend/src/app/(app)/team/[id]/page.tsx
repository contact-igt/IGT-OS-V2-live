'use client';
import { useState, use, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';
import { Mail, Briefcase, Target, Clock, Calendar, ArrowLeft, CheckCircle2, TrendingUp, DollarSign, BarChart3, Zap, AlertCircle, Send } from 'lucide-react';
import TaskDrawer from '@/components/tasks/TaskDrawer';
import { Task, Client, TeamMember, CATEGORY_LABELS } from '@/lib/data';

// ──────────────────────────────────────────────────────────────
// AI ENGINE — reads real task data, generates contextual answers
// ──────────────────────────────────────────────────────────────

function computeMemberAnalytics(member: TeamMember, tasks: Task[], clients: Client[], meetings: any[]) {
  const memberTasks = tasks.filter(t => t.assignedTo.includes(member.id));
  const totalLogged = memberTasks.reduce((acc, t) => acc + (t.loggedMinutes || 0), 0);
  const totalEstimated = memberTasks.reduce((acc, t) => acc + (t.estimatedHours || 0) * 60, 0);
  const efficiency = totalEstimated > 0 ? Math.round((totalLogged / totalEstimated) * 100) : 0;

  // By category
  const byCategory: Record<string, { count: number; minutes: number; estimatedMins: number }> = {};
  memberTasks.forEach(t => {
    if (!byCategory[t.category]) byCategory[t.category] = { count: 0, minutes: 0, estimatedMins: 0 };
    byCategory[t.category].count += 1;
    byCategory[t.category].minutes += t.loggedMinutes || 0;
    byCategory[t.category].estimatedMins += (t.estimatedHours || 0) * 60;
  });

  // By client
  const byClient: Record<string, { name: string; minutes: number; count: number }> = {};
  memberTasks.forEach(t => {
    const c = clients.find(cl => cl.id === t.clientId);
    if (!c) return;
    if (!byClient[t.clientId]) byClient[t.clientId] = { name: c.name, minutes: 0, count: 0 };
    byClient[t.clientId].minutes += t.loggedMinutes || 0;
    byClient[t.clientId].count += 1;
  });

  // Overrun tasks
  const overrunTasks = memberTasks.filter(
    t => t.estimatedHours > 0 && (t.loggedMinutes || 0) > t.estimatedHours * 60 * 1.2
  );

  // Done vs total
  const doneTasks = memberTasks.filter(t => t.status === 'done');

  // 30-day and 7-day
  const now = new Date();
  const ago30 = new Date(now); ago30.setDate(ago30.getDate() - 30);
  const ago7 = new Date(now); ago7.setDate(ago7.getDate() - 7);
  const done30 = memberTasks.filter(t => t.status === 'done' && new Date(t.updatedAt) > ago30);
  const done7 = memberTasks.filter(t => t.status === 'done' && new Date(t.updatedAt) > ago7);

  // Salary cost estimate (₹ per hour)
  const monthlySalary = 25000; // placeholder — can be per-member field later
  const workingHoursPerMonth = 176;
  const hourlyCost = Math.round(monthlySalary / workingHoursPerMonth);

  // Meetings
  const memberMeetings = meetings.filter(m => m.speakerAnalytics?.some((sa: any) => sa.userId === member.id));
  const totalMeetingMins = memberMeetings.reduce((acc, m) => acc + m.duration, 0);
  const avgSpeakerShare = memberMeetings.length > 0
    ? Math.round(memberMeetings.reduce((acc, m) => {
        const share = m.speakerAnalytics?.find((sa: any) => sa.userId === member.id)?.percentage || 0;
        return acc + share;
      }, 0) / memberMeetings.length)
    : 0;

  return { memberTasks, totalLogged, totalEstimated, efficiency, byCategory, byClient, overrunTasks, doneTasks, done30, done7, hourlyCost, monthlySalary, memberMeetings, totalMeetingMins, avgSpeakerShare };
}

function generateAIResponse(
  query: string,
  member: TeamMember,
  tasks: Task[],
  clients: Client[],
  meetings: any[]
): string {
  const q = query.toLowerCase();
  const a = computeMemberAnalytics(member, tasks, clients, meetings);
  const name = member.name.split(' ')[0];
  const hrs = Math.round(a.totalLogged / 60);
  const estHrs = Math.round(a.totalEstimated / 60);

  // Efficiency / overview
  if (q.includes('efficient') || q.includes('efficiency') || q.includes('how is') || q.includes('overview') || q.includes('summary')) {
    const emoji = a.efficiency <= 85 ? '🟢' : a.efficiency <= 110 ? '🟡' : '🔴';
    return `${emoji} **${name}'s Efficiency Report**\n\n` +
      `• **Total tasks:** ${a.memberTasks.length} (${a.doneTasks.length} done)\n` +
      `• **Hours logged:** ${hrs}h vs ${estHrs}h estimated\n` +
      `• **Efficiency:** ${a.efficiency}% ${a.efficiency <= 100 ? '(on track ✅)' : '(over estimated ⚠️)'}\n` +
      `• **Last 7 days:** ${a.done7.length} tasks done\n` +
      `• **Last 30 days:** ${a.done30.length} tasks done\n\n` +
      (a.overrunTasks.length > 0
        ? `⚠️ ${a.overrunTasks.length} task(s) overran estimates significantly. Check the "overrun" analysis for details.`
        : `✅ No significant overruns detected.`);
  }

  // Category breakdown
  if (q.includes('category') || q.includes('type') || q.includes('what kind') || q.includes('breakdown')) {
    const sorted = Object.entries(a.byCategory)
      .sort((x, y) => y[1].minutes - x[1].minutes)
      .slice(0, 5);
    if (sorted.length === 0) return `No task data found for ${name} yet.`;
    const lines = sorted.map(([cat, d]) => {
      const avgMins = d.count > 0 ? Math.round(d.minutes / d.count) : 0;
      return `• **${CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat}** — ${d.count} tasks, avg ${Math.round(avgMins / 60)}h ${avgMins % 60}m each`;
    });
    return `📊 **Task Category Breakdown for ${name}:**\n\n${lines.join('\n')}\n\n` +
      `Top category: **${CATEGORY_LABELS[sorted[0][0] as keyof typeof CATEGORY_LABELS] || sorted[0][0]}** (${sorted[0][1].count} tasks)`;
  }

  // Client breakdown
  if (q.includes('client') || q.includes('account') || q.includes('who takes') || q.includes('which client')) {
    const sorted = Object.entries(a.byClient)
      .sort((x, y) => y[1].minutes - x[1].minutes)
      .slice(0, 5);
    if (sorted.length === 0) return `No client data for ${name} yet.`;
    const lines = sorted.map(([, d]) => {
      return `• **${d.name}** — ${Math.round(d.minutes / 60)}h logged across ${d.count} tasks`;
    });
    return `👥 **Client Hour Distribution for ${name}:**\n\n${lines.join('\n')}\n\n` +
      `Most hours spent on: **${sorted[0][1].name}** (${Math.round(sorted[0][1].minutes / 60)}h)`;
  }

  // Overrun / waste
  if (q.includes('overrun') || q.includes('wasted') || q.includes('waste') || q.includes('over') || q.includes('delay')) {
    if (a.overrunTasks.length === 0) {
      return `✅ Great news — ${name} has no tasks that overran estimates by more than 20%. Time is well controlled.`;
    }
    const lines = a.overrunTasks.slice(0, 5).map(t => {
      const diff = Math.round(((t.loggedMinutes || 0) - t.estimatedHours * 60) / 60);
      const client = clients.find(c => c.id === t.clientId);
      return `• **${t.title}** (${client?.code || '?'}) — +${diff}h over estimate`;
    });
    const totalWasted = a.overrunTasks.reduce((acc, t) => {
      return acc + Math.max(0, (t.loggedMinutes || 0) - t.estimatedHours * 60);
    }, 0);
    return `⚠️ **Overrun Analysis for ${name}:**\n\n${lines.join('\n')}\n\n` +
      `Total excess time: **${Math.round(totalWasted / 60)}h** across ${a.overrunTasks.length} tasks. ` +
      `At ₹${a.hourlyCost}/hr, that's approx **₹${Math.round((totalWasted / 60) * a.hourlyCost).toLocaleString('en-IN')}** in unplanned cost.`;
  }

  // Cost / pricing / salary
  if (q.includes('cost') || q.includes('price') || q.includes('salary') || q.includes('charge') || q.includes('billing') || q.includes('profit')) {
    const topCat = Object.entries(a.byCategory).sort((x, y) => y[1].minutes - x[1].minutes)[0];
    const avgHrsPerTask = topCat ? Math.round(topCat[1].minutes / topCat[1].count / 60 * 10) / 10 : 0;
    return `💰 **Cost & Pricing Analysis for ${name}:**\n\n` +
      `• **Estimated salary cost:** ₹${a.monthlySalary.toLocaleString('en-IN')}/month\n` +
      `• **Hourly cost (to agency):** ₹${a.hourlyCost}/hr\n` +
      `• **Total hours logged:** ${hrs}h\n` +
      `• **Agency cost for ${name}'s work:** ₹${(hrs * a.hourlyCost).toLocaleString('en-IN')}\n\n` +
      (topCat
        ? `📦 For **${CATEGORY_LABELS[topCat[0] as keyof typeof CATEGORY_LABELS] || topCat[0]}** tasks:\n` +
          `• Avg time per task: **${avgHrsPerTask}h**\n` +
          `• Agency cost per task: **₹${Math.round(avgHrsPerTask * a.hourlyCost).toLocaleString('en-IN')}**\n` +
          `• Recommended client price (2× markup): **₹${Math.round(avgHrsPerTask * a.hourlyCost * 2).toLocaleString('en-IN')}** per task`
        : '');
  }

  // Meetings / Speaking
  if (q.includes('meeting') || q.includes('speak') || q.includes('share') || q.includes('participation')) {
    if (a.memberMeetings.length === 0) {
      return `${name} hasn't attended any recorded meetings yet.`;
    }
    const lines = a.memberMeetings.slice(0, 5).map(m => {
      const share = m.speakerAnalytics?.find((sa: any) => sa.userId === member.id)?.percentage || 0;
      return `• **${m.title}**: ${share}% speaking share`;
    });
    return `🎙️ **Meeting Participation for ${name}:**\n\n` +
      `• **Total meetings:** ${a.memberMeetings.length}\n` +
      `• **Avg speaking share:** ${a.avgSpeakerShare}%\n\n` +
      `Recent meetings:\n${lines.join('\n')}\n\n` +
      (a.avgSpeakerShare < 15 
        ? `💡 ${name} tends to be quiet in meetings. Consider asking them for more input.`
        : `💡 ${name} participates well in meetings.`);
  }

  // Automation / time saving
  if (q.includes('automat') || q.includes('save') || q.includes('faster') || q.includes('ai') || q.includes('improve')) {
    const topCat = Object.entries(a.byCategory).sort((x, y) => y[1].minutes - x[1].minutes)[0];
    const catName = topCat ? (CATEGORY_LABELS[topCat[0] as keyof typeof CATEGORY_LABELS] || topCat[0]) : 'their main category';
    const potentialSavingMins = topCat ? Math.round(topCat[1].minutes * 0.25) : 0;
    return `🤖 **Automation Opportunity Analysis:**\n\n` +
      `${name} spends the most time on **${catName}** tasks (${Math.round((topCat?.[1].minutes || 0) / 60)}h total).\n\n` +
      `• A 25% automation gain in repetitive sub-tasks could save **${Math.round(potentialSavingMins / 60)}h/month**\n` +
      `• That's approx **₹${Math.round((potentialSavingMins / 60) * a.hourlyCost).toLocaleString('en-IN')}/month** in reclaimed capacity\n` +
      `• This capacity could be used for higher-value tasks or new clients\n\n` +
      `💡 Recommendation: Identify the 3 most repetitive sub-tasks in ${catName} and template them.`;
  }

  // Default / fallback
  return `I can analyze **${name}'s** data on:\n\n` +
    `• Efficiency & time utilization\n` +
    `• Task breakdown by category\n` +
    `• Which clients take the most time\n` +
    `• Overruns and wasted hours\n` +
    `• Cost-per-task and client pricing\n` +
    `• Meeting participation and speaking share\n` +
    `• Automation savings potential\n\n` +
    `Try asking: *"Which client takes the most hours?"* or *"What tasks overran?"*`;
}

const QUICK_QUESTIONS = [
  'Show efficiency overview',
  'Which client takes most hours?',
  'Break down by category',
  'What tasks overran?',
  'Cost & pricing analysis',
  'Automation savings estimate',
];

// ──────────────────────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────────────────────

export default function TeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state } = useApp();
  const router = useRouter();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [memberView, setMemberView] = useState<'overview' | 'calendar' | 'gantt' | 'list'>('overview');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [aiInput, setAiInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const member = state.teamMembers.find(m => m.id === id);

  const initMessage = member
    ? `Hi! I'm analyzing **${member.name.split(' ')[0]}'s** workspace. Ask me about their efficiency, which clients take the most time, cost-per-task estimates, or automation opportunities.`
    : 'Loading member data…';

  const [aiChat, setAiChat] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    { role: 'ai', text: initMessage },
  ]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChat]);

  if (!member) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text font-syne mb-2">Member not found</h2>
          <button onClick={() => router.push('/team')} className="btn-primary">Back to Team</button>
        </div>
      </div>
    );
  }

  const analytics = computeMemberAnalytics(member, state.tasks, state.clients, state.meetings);
  const { memberTasks, totalLogged, efficiency, done30, done7, doneTasks, overrunTasks, hourlyCost, memberMeetings, totalMeetingMins, avgSpeakerShare } = analytics;
  const totalHrs = Math.round(totalLogged / 60);
  const activeTasks = memberTasks.filter(t => t.status !== 'done');
  const completedTasks = memberTasks.filter(t => t.status === 'done').sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const handleAiSubmit = (query: string) => {
    const q = query.trim();
    if (!q) return;
    setAiChat(prev => [...prev, { role: 'user', text: q }]);
    setAiInput('');
    setIsAiTyping(true);
    setTimeout(() => {
      const response = generateAIResponse(q, member, state.tasks, state.clients, state.meetings);
      setAiChat(prev => [...prev, { role: 'ai', text: response }]);
      setIsAiTyping(false);
      // eslint-disable-next-line
    }, 700 + Math.random() * 400);
  };

  const formatAiText = (text: string) => {
    // Simple markdown-ish formatting
    return text.split('\n').map((line, i) => {
      const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      const italic = bold.replace(/\*(.*?)\*/g, '<em>$1</em>');
      return <p key={i} className="mb-1 last:mb-0" dangerouslySetInnerHTML={{ __html: italic }} />;
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 relative z-10">
        <button
          onClick={() => router.push('/team')}
          className="p-2 rounded-lg bg-surface-2 border border-border text-text-2 hover:text-text hover:bg-hover transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-3xl font-bold text-text font-syne">Team Member Profile</h2>
      </div>

      <div className="flex flex-col h-full bg-app-surface border border-app-border rounded-xl shadow-sm overflow-hidden z-10 relative">
        {/* Profile Header */}
        <div className="flex items-start gap-6 p-8 border-b border-app-border bg-surface-2">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-[36px] font-bold text-white shadow-lg flex-shrink-0"
            style={{ background: member.color }}
          >
            {member.initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-[32px] text-text font-syne truncate mb-1">{member.name}</h2>
            <div className="flex flex-wrap items-center gap-4 text-[14px]">
              <p className="font-bold text-primary">{member.department} · <span className="uppercase">{member.role}</span></p>
              <a href={`mailto:${member.email}`} className="text-text-2 hover:text-primary flex items-center gap-1.5 bg-surface border border-border px-3 py-1 rounded-full">
                <Mail className="w-4 h-4" /> {member.email}
              </a>
            </div>
            {/* Quick Stats Strip */}
            <div className="flex flex-wrap gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-text-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span><span className="text-text font-bold">{efficiency}%</span> efficient</span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-text-2">
                <Clock className="w-4 h-4 text-primary" />
                <span><span className="text-text font-bold">{totalHrs}h</span> logged</span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-text-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span><span className="text-text font-bold">{doneTasks.length}</span> done</span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-text-2">
                <DollarSign className="w-4 h-4 text-amber-500" />
                <span>₹<span className="text-text font-bold">{hourlyCost}</span>/hr cost</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-8 px-8 border-b border-app-border bg-surface-2 pt-2">
          {(['overview', 'gantt', 'calendar', 'list'] as const).map(view => (
            <button
              key={view}
              onClick={() => setMemberView(view)}
              className={`pb-4 text-[14px] font-bold border-b-2 transition-colors capitalize ${memberView === view ? 'border-primary text-primary' : 'border-transparent text-text-2 hover:text-text'}`}
            >
              {view === 'overview' ? 'Overview & AI' : view}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-app-bg custom-scrollbar relative">

          {/* ── OVERVIEW + AI ── */}
          {memberView === 'overview' && (
            <div className="flex flex-col gap-8 max-w-7xl mx-auto">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card-surface2 p-5 flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider">7-Day Hours</span>
                  <div className="text-[28px] font-bold text-text num flex items-baseline gap-1">
                    {member.hoursThisWeek}h <span className="text-[13px] text-text-2 font-semibold">/ {member.weeklyTarget}h</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-3 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (member.hoursThisWeek / member.weeklyTarget) * 100)}%` }} />
                  </div>
                </div>

                <div className="card-surface2 p-5 flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider">30-Day Done</span>
                  <div className="text-[28px] font-bold text-text num">{done30.length} <span className="text-[13px] text-text-2 font-semibold">tasks</span></div>
                  <span className="text-[11px] text-text-3">{done7.length} in last 7 days</span>
                </div>

                <div className="card-surface2 p-5 flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider">Efficiency</span>
                  <div className={`text-[28px] font-bold num ${efficiency > 110 ? 'text-red-500' : efficiency > 90 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {efficiency}%
                  </div>
                  <span className="text-[11px] text-text-3">{totalHrs}h logged vs {Math.round(analytics.totalEstimated / 60)}h est.</span>
                </div>

                <div className="card-surface2 p-5 flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider">Avg Speaker Share</span>
                  <div className="text-[28px] font-bold text-primary num flex items-baseline gap-1">
                    {avgSpeakerShare}%
                  </div>
                  <span className="text-[11px] text-text-3">Across {memberMeetings.length} meetings</span>
                </div>
              </div>

              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left: Tasks */}
                <div className="lg:col-span-3 flex flex-col gap-6">
                  {/* Active Tasks */}
                  <div className="card p-6">
                    <h3 className="text-[18px] font-bold text-text mb-4 flex items-center gap-2 font-syne">
                      <Briefcase className="w-5 h-5 text-primary" /> Active & Upcoming ({activeTasks.length})
                    </h3>
                    <div className="flex flex-col gap-3">
                      {activeTasks.slice(0, 5).map(t => {
                        const client = state.clients.find(c => c.id === t.clientId);
                        const isOverdue = t.deadline && t.deadline < new Date().toISOString().split('T')[0];
                        const pct = t.estimatedHours > 0 ? Math.min(100, Math.round((t.loggedMinutes || 0) / (t.estimatedHours * 60) * 100)) : 0;
                        return (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTaskId(t.id)}
                            className="p-4 border border-border rounded-xl bg-surface-2 hover:border-primary/50 cursor-pointer transition-colors group"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[14px] font-bold text-text group-hover:text-primary transition-colors truncate">{t.title}</span>
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
                                style={{
                                  background: t.status === 'in_progress' ? '#3B82F620' : 'var(--c-surface-3)',
                                  color: t.status === 'in_progress' ? '#3B82F6' : 'var(--c-text-3)',
                                }}
                              >
                                {t.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] font-semibold text-text-2">
                              <span className="text-primary">{client?.code}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.estimatedHours}h est.</span>
                              {t.deadline && (
                                <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
                                  <Calendar className="w-3 h-3" />
                                  {new Date(t.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                            </div>
                            {pct > 0 && (
                              <div className="mt-2 h-1 bg-surface-3 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${pct}%`, background: pct >= 100 ? '#EF4444' : '#2AB182' }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {activeTasks.length === 0 && (
                        <p className="text-[13px] text-text-3 italic p-6 text-center bg-surface-2 border border-border rounded-xl">No active tasks.</p>
                      )}
                    </div>
                  </div>

                  {/* Completed History */}
                  <div className="card p-6">
                    <h3 className="text-[18px] font-bold text-text mb-4 flex items-center gap-2 font-syne">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Task History
                    </h3>
                    <div className="flex flex-col gap-2">
                      {completedTasks.slice(0, 5).map(t => {
                        const client = state.clients.find(c => c.id === t.clientId);
                        const hrs = Math.round((t.loggedMinutes || 0) / 60);
                        return (
                          <div key={t.id} onClick={() => setSelectedTaskId(t.id)} className="p-3 border border-border rounded-xl bg-surface-2 hover:bg-hover cursor-pointer transition-colors group flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-bold text-text group-hover:text-primary truncate">{t.title}</div>
                              <div className="text-[11px] text-text-3">{client?.name} · {hrs}h logged</div>
                            </div>
                            <span className="text-[10px] text-text-3 flex-shrink-0">
                              {new Date(t.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        );
                      })}
                      {completedTasks.length > 5 && (
                        <button onClick={() => setMemberView('list')} className="text-center text-[12px] text-primary font-bold mt-1 hover:underline">
                          View all {completedTasks.length} completed tasks →
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Meeting Participation */}
                  {memberMeetings.length > 0 && (
                    <div className="card p-6">
                      <h3 className="text-[18px] font-bold text-text mb-4 flex items-center gap-2 font-syne">
                        <span className="material-symbols-outlined text-purple-500">mic</span> Meeting Participation
                      </h3>
                      <div className="flex flex-col gap-4">
                        {memberMeetings.slice(0, 3).map(m => {
                          const share = m.speakerAnalytics?.find((sa: any) => sa.userId === member.id)?.percentage || 0;
                          return (
                            <div key={m.id} className="p-4 border border-border rounded-xl bg-surface-2 flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-purple-500">groups</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[14px] font-bold text-text truncate">{m.title}</div>
                                <div className="text-[11px] text-text-3">{m.time} · {m.duration} mins</div>
                              </div>
                              <div className="flex flex-col items-end gap-1 min-w-[80px]">
                                <div className="text-[13px] font-bold text-purple-500">{share}% Share</div>
                                <div className="w-full h-1.5 bg-surface-3 rounded-full overflow-hidden">
                                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${share}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: AI Chatbot */}
                <div className="lg:col-span-2">
                  <div className="card p-0 flex flex-col h-full min-h-[600px] overflow-hidden">
                    {/* AI Header */}
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-blue-500/5">
                      <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-[20px]">smart_toy</span>
                      </div>
                      <div>
                        <h3 className="text-[15px] font-bold text-text font-syne">Nexus AI Analysis</h3>
                        <p className="text-[11px] text-text-3">Data-driven insights on {member.name.split(' ')[0]}</p>
                      </div>
                      <div className="ml-auto flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] text-text-3 font-bold">LIVE DATA</span>
                      </div>
                    </div>

                    {/* Quick question chips */}
                    <div className="px-4 py-3 border-b border-border bg-surface-2 flex flex-wrap gap-1.5">
                      {QUICK_QUESTIONS.map(q => (
                        <button
                          key={q}
                          onClick={() => handleAiSubmit(q)}
                          className="text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors hover:bg-primary hover:text-white hover:border-primary"
                          style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-2)', background: 'var(--c-surface-3)' }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                      {aiChat.map((msg, i) => (
                        <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] ${msg.role === 'ai' ? 'bg-primary/20' : 'bg-surface-3'}`}
                          >
                            {msg.role === 'ai'
                              ? <span className="material-symbols-outlined text-primary text-[14px]">smart_toy</span>
                              : <span className="material-symbols-outlined text-text-2 text-[14px]">person</span>
                            }
                          </div>
                          <div
                            className={`p-3 rounded-xl text-[12px] leading-relaxed max-w-[90%] ${
                              msg.role === 'user'
                                ? 'bg-primary/10 text-text border border-primary/20 rounded-tr-none'
                                : 'bg-surface-2 text-text border border-border rounded-tl-none'
                            }`}
                          >
                            {formatAiText(msg.text)}
                          </div>
                        </div>
                      ))}
                      {isAiTyping && (
                        <div className="flex gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-primary text-[14px]">smart_toy</span>
                          </div>
                          <div className="p-3 rounded-xl bg-surface-2 border border-border rounded-tl-none flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-text-3 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-text-3 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-text-3 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="px-4 py-3 border-t border-border bg-surface-2">
                      <form
                        onSubmit={e => { e.preventDefault(); handleAiSubmit(aiInput); }}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          className="input-base flex-1 text-[13px]"
                          placeholder="Ask about efficiency, cost, clients…"
                          value={aiInput}
                          onChange={e => setAiInput(e.target.value)}
                          disabled={isAiTyping}
                        />
                        <button
                          type="submit"
                          disabled={!aiInput.trim() || isAiTyping}
                          className="p-2 rounded-lg transition-colors"
                          style={{ background: '#2AB182', color: 'white', opacity: !aiInput.trim() || isAiTyping ? 0.5 : 1 }}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── CALENDAR VIEW ── */}
          {memberView === 'calendar' && (
            <div className="flex flex-col h-full bg-surface-2 border border-border p-6 rounded-xl max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[18px] font-bold text-text flex items-center gap-2 font-syne">
                  <Calendar className="w-5 h-5 text-primary" /> Task Schedule
                </h3>
                <div className="flex items-center gap-2 bg-surface p-1 rounded-lg border border-border shadow-sm">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                    className="p-1.5 text-text-2 hover:text-text hover:bg-surface-2 rounded transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>
                  <span className="text-[14px] font-bold px-4 w-[160px] text-center font-syne">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                    className="p-1.5 text-text-2 hover:text-text hover:bg-surface-2 rounded transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-7 grid-rows-[auto_1fr_1fr_1fr_1fr_1fr] gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-bold text-[11px] text-text-3 uppercase tracking-wider py-2 bg-surface rounded-lg">{day}</div>
                ))}
                {Array.from({ length: 35 }).map((_, i) => {
                  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
                  const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i - firstDay + 1);
                  const dateStr = d.toISOString().split('T')[0];
                  const dayTasks = memberTasks.filter(t => t.deadline && t.deadline.startsWith(dateStr));
                  const isToday = dateStr === new Date().toISOString().split('T')[0];
                  const isCurrentMonth = d.getMonth() === currentMonth.getMonth();
                  return (
                    <div
                      key={i}
                      className={`min-h-[90px] p-2 rounded-xl border transition-all ${isToday ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-text-3'} ${!isCurrentMonth ? 'opacity-30' : ''}`}
                    >
                      <div className={`text-[11px] font-bold mb-1.5 ${isToday ? 'text-primary' : 'text-text-2'}`}>{d.getDate()}</div>
                      <div className="flex flex-col gap-1">
                        {dayTasks.map(t => (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTaskId(t.id)}
                            className="text-[10px] font-bold truncate px-1.5 py-0.5 rounded cursor-pointer border"
                            style={{ borderColor: 'var(--c-primary)', color: 'var(--c-text)', background: 'var(--c-surface-2)' }}
                            title={t.title}
                          >
                            {t.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── LIST VIEW ── */}
          {memberView === 'list' && (
            <div className="flex flex-col bg-surface-2 border border-border p-6 rounded-xl max-w-7xl mx-auto">
              <h3 className="text-[18px] font-bold text-text mb-4 flex items-center gap-2 font-syne">
                <span className="material-symbols-outlined text-primary">list</span> All Tasks ({memberTasks.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-bold text-text-3 uppercase tracking-wider" style={{ borderBottom: '1px solid var(--c-border)' }}>
                      <th className="p-3">Task</th>
                      <th className="p-3">Client</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Deadline</th>
                      <th className="p-3 text-right">Est.</th>
                      <th className="p-3 text-right">Logged</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberTasks.map(t => {
                      const client = state.clients.find(c => c.id === t.clientId);
                      const isOverdue = t.deadline && t.status !== 'done' && t.deadline < new Date().toISOString().split('T')[0];
                      const loggedHrs = Math.round((t.loggedMinutes || 0) / 60 * 10) / 10;
                      const overrun = t.estimatedHours > 0 && (t.loggedMinutes || 0) > t.estimatedHours * 60 * 1.2;
                      return (
                        <tr
                          key={t.id}
                          className="cursor-pointer transition-colors"
                          style={{ borderBottom: '1px solid var(--c-border)' }}
                          onClick={() => setSelectedTaskId(t.id)}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--c-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td className="p-3 text-[13px] font-bold text-text max-w-[220px]">
                            <div className="truncate">{t.title}</div>
                            <div className="text-[10px] text-text-3 font-normal">{t.id}</div>
                          </td>
                          <td className="p-3 text-[12px] text-text-2">{client?.code || '?'}</td>
                          <td className="p-3 text-[11px] text-text-3">{CATEGORY_LABELS[t.category] || t.category}</td>
                          <td className="p-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: 'var(--c-surface-3)', color: 'var(--c-text-2)' }}>
                              {t.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className={`p-3 text-[12px] ${isOverdue ? 'text-red-500 font-bold' : 'text-text-2'}`}>
                            {t.deadline ? new Date(t.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                          </td>
                          <td className="p-3 text-[12px] text-text-2 text-right">{t.estimatedHours}h</td>
                          <td className={`p-3 text-[12px] text-right font-bold ${overrun ? 'text-red-500' : 'text-text-2'}`}>
                            {loggedHrs}h {overrun && <AlertCircle className="w-3 h-3 inline" />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {memberTasks.length === 0 && <p className="text-center text-text-3 text-[13px] py-8">No tasks found.</p>}
              </div>
            </div>
          )}

          {/* ── GANTT VIEW ── */}
          {memberView === 'gantt' && (
            <div className="flex flex-col bg-surface-2 border border-border p-12 rounded-xl max-w-7xl mx-auto items-center justify-center text-center">
              <span className="material-symbols-outlined text-[48px] text-primary mb-4">view_timeline</span>
              <h3 className="text-[20px] font-bold text-text font-syne mb-2">View in Global Timeline</h3>
              <p className="text-[14px] text-text-2 max-w-[400px] mb-6">
                To view this member&apos;s full timeline, use the master Gantt chart which supports zooming and cross-member dependencies.
              </p>
              <button onClick={() => router.push('/gantt')} className="btn-primary">
                Go to Gantt Chart
              </button>
            </div>
          )}
        </div>
      </div>

      <TaskDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </div>
  );
}
