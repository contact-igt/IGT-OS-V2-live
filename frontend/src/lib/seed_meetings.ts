/* eslint-disable @typescript-eslint/no-explicit-any */

// ─────────────────────────────────────────────────────────────
// DASHBOARD SEED DATA — Attendance, Ad Accounts, GitHub, Leads,
// Campaigns, Meetings. All mock data for dashboard display.
// ─────────────────────────────────────────────────────────────

// ── INTERFACES ──────────────────────────────────────────────

export interface AttendanceBreak {
  id: string;
  breakStart: string;
  breakEnd?: string | null;
}

export interface AttendanceLog {
  id?: string;
  userId: string;
  date: string;          // YYYY-MM-DD
  clockIn: string | null; // HH:MM IST
  clockOut: string | null;
  totalMinutes: number;
  status?: 'present' | 'absent' | 'half_day' | 'late' | 'leave' | 'holiday' | 'weekend' | 'auto_closed';
  lateReturn?: boolean;   // true if this session's clock-in came >60min after the previous session's clock-out
  breaks?: AttendanceBreak[];
  isOnBreak?: boolean;
}

export interface AdAccountBalance {
  id: string;
  clientId: string;
  platform: 'google' | 'meta';
  accountId: string;
  accountName: string;
  allocatedINR: number;
  balanceINR: number;
  dailySpendINR: number;
  daysRemaining: number;
  lastSynced: string;
  payer: 'client' | 'invictus';
}

export interface GitHubDevActivity {
  userId: string;
  commitsThisWeek: number;
  lastCommitAt: string;   // ISO timestamp or relative like "2h ago"
  openPRs: number;
  mergedPRsThisWeek: number;
  blockedTasks: number;
}

export interface GitHubRepo {
  name: string;
  clientId: string | null;
  commitsThisWeek: number;
  lastPushed: string;
  contributors: string[];
  status: 'active' | 'stalled' | 'completed';
}

export interface Lead {
  id: string;
  name: string; // Used as Company
  contactPerson: string;
  industry: string;
  stage: 'discovery' | 'proposal' | 'revision' | 'closing' | 'won' | 'lost' | 'paused';
  monthlyValueINR: number;
  lastContactDate: string;
  nextFollowUp: string | null;
  servicesNeeded?: string[];
  smmDeliverables?: string;
  brandBrief?: {
    goal?: string;
    expectation?: string;
    location?: string;
    category?: string;
    retainer?: number;
    adBudget?: number;
  };
  priceQuoted?: number;
  proposalDiscussed?: boolean;
  lostReason?: string;
  source: string;
  assignedTo: string;
  score: number;
  stageHistory: { stage: string; date: string }[];
}

export interface CampaignLog {
  clientId: string;
  clientName: string;
  channels: string[];
  weekLeads: number;
  cpl: number;
  status: 'good' | 'ok' | 'high' | 'new';
  servicesNeeded?: string[]; // 'smm', 'performance_marketing', 'website', 'whatsnexus'
  smmDeliverables?: string;
  brandBrief?: {
    goal: string;
    expectation: string;
    location: string;
    category: string;
    retainer: number;
    adBudget: number;
  };
  priceQuoted?: number;
  proposalDiscussed?: boolean;
}

export interface MeetingEvent {
  id: string;
  title: string;
  clientId: string | null;
  time: string;          // HH:MM AM/PM
  duration: number;      // minutes
  attendee: string;
  meetLink: string | null;
  prepNotes: string;
  speakerAnalytics?: { userId: string; percentage: number }[];
  summaryVisualized?: boolean;
}

export interface GitHubCommit {
  id: string;
  userId: string;
  // Raw GitHub author username straight from the commit — kept even when userId can't be
  // resolved to an employee (e.g. an org-level account like "contact-igt" used for merges),
  // so the UI can still show something meaningful instead of a blank "??" row.
  authorName?: string | null;
  repo: string;
  clientId: string | null;
  taskId: string | null;
  message: string;
  additions: number;
  deletions: number;
  timestamp: string; // ISO date
  isLive?: boolean;
}

export interface AdRechargeEvent {
  id: string;
  date: string; // ISO date
  clientId: string;
  platform: 'google' | 'meta' | 'youtube';
  amountINR: number;
  recharger: 'client' | 'invictus';
  method: 'auto' | 'manual';
  loggedBy?: string;
}

export interface DevProject {
  id: string;
  repoName: string;
  clientId: string | null;
  name: string;
  commitsThisWeek: number;
  developers: string[]; // user IDs
  status: 'active' | 'at_risk' | 'handover' | 'completed';
  openPRs: number;
  openIssues: number;
  lastPush: string;
  isInternal: boolean;
  progressPercent?: number;
  estCompletion?: string;
  openTaskIds?: string[];
  alertMessage?: string;
}

export interface SocialAccount {
  id: string;
  clientId: string | null;
  platform: 'instagram' | 'youtube';
  label: string;
  lastSyncedAt: string | null;
  lastUpdated: string | null;
  followers: number | null;
  followersChange: string | null;
  followersGrowth30d: number | null;
  reach: number | null;
  reachChange: string | null;
  views: number | null;
  viewsChange: string | null;
  watchTimeHours: number | null;
  engagementRate: number | null;
  sinceLastSync: {
    followers: number;
    reachPct: string | null;
    viewsPct: string | null;
    engagementRateDelta: string | null;
  } | null;
  latestPosts: { title: string; publishedAt: string; views: number; comments?: number; likes?: number; url: string }[];
}

// ── SEED: ATTENDANCE (today = Jul 12 2026) ──────────────────

export const ATTENDANCE_TODAY: AttendanceLog[] = [
  { userId: '101', date: '2026-07-12', clockIn: '08:30', clockOut: null, totalMinutes: 0 },
  { userId: '102', date: '2026-07-12', clockIn: '09:15', clockOut: null, totalMinutes: 0 },
  { userId: '103', date: '2026-07-12', clockIn: '09:00', clockOut: null, totalMinutes: 0 },
  { userId: '111', date: '2026-07-12', clockIn: '09:30', clockOut: null, totalMinutes: 0 },
  { userId: '112', date: '2026-07-12', clockIn: '09:45', clockOut: null, totalMinutes: 0 },
  { userId: '113', date: '2026-07-12', clockIn: '09:20', clockOut: null, totalMinutes: 0 },
  { userId: '104', date: '2026-07-12', clockIn: '09:40', clockOut: null, totalMinutes: 0 },
  { userId: '109', date: '2026-07-12', clockIn: '09:24', clockOut: null, totalMinutes: 0 },
  { userId: '110', date: '2026-07-12', clockIn: '10:05', clockOut: null, totalMinutes: 0 },
  { userId: '106', date: '2026-07-12', clockIn: '09:10', clockOut: null, totalMinutes: 0 },
  { userId: '105', date: '2026-07-12', clockIn: null, clockOut: null, totalMinutes: 0 },
  { userId: '107', date: '2026-07-12', clockIn: '09:35', clockOut: null, totalMinutes: 0 },
  { userId: '114', date: '2026-07-12', clockIn: null, clockOut: null, totalMinutes: 0 },
  { userId: '108', date: '2026-07-12', clockIn: null, clockOut: null, totalMinutes: 0 },
];

// ── SEED: AD ACCOUNT BALANCES ───────────────────────────────

export const AD_ACCOUNT_BALANCES: AdAccountBalance[] = [
  { id: 'ad-1', clientId: 'c1',  platform: 'google', accountId: 'PXLE-G', accountName: 'Pixel Eye Hospital - Main', allocatedINR: 68000, balanceINR: 4200,  dailySpendINR: 2100, daysRemaining: 2.0, lastSynced: '2026-07-12T04:10:00Z', payer: 'client' },
  { id: 'ad-2', clientId: 'c1',  platform: 'meta',   accountId: 'PXLE-M', accountName: 'Pixel Eye - Meta Ads', allocatedINR: 22000, balanceINR: 3800,  dailySpendINR: 800,  daysRemaining: 4.8, lastSynced: '2026-07-12T04:10:00Z', payer: 'client' },
  { id: 'ad-3', clientId: 'c6',  platform: 'meta',   accountId: 'PHNX-M', accountName: 'Phoenix Fitness Official', allocatedINR: 35000, balanceINR: 1200,  dailySpendINR: 700,  daysRemaining: 1.7, lastSynced: '2026-07-12T04:10:00Z', payer: 'client' },
  { id: 'ad-4', clientId: 'c6',  platform: 'google', accountId: 'PHNX-G', accountName: 'Phoenix Fitness Search', allocatedINR: 15000, balanceINR: 8600,  dailySpendINR: 600,  daysRemaining: 14.3, lastSynced: '2026-07-12T04:10:00Z', payer: 'client' },
  { id: 'ad-5', clientId: 'c4',  platform: 'google', accountId: 'ANTR-G', accountName: 'Antardrashti Main', allocatedINR: 25000, balanceINR: 12100, dailySpendINR: 1200, daysRemaining: 10.1, lastSynced: '2026-07-12T04:10:00Z', payer: 'client' },
  { id: 'ad-6', clientId: 'c5',  platform: 'google', accountId: 'AARV-G', accountName: 'Aarav Eye Main', allocatedINR: 10000, balanceINR: 2400,  dailySpendINR: 1200, daysRemaining: 2.0, lastSynced: '2026-07-12T04:10:00Z', payer: 'client' },
  { id: 'ad-7', clientId: 'c7',  platform: 'google', accountId: 'RIOC-G', accountName: 'Rio Childrens Main', allocatedINR: 22400, balanceINR: 9800,  dailySpendINR: 1400, daysRemaining: 7.0, lastSynced: '2026-07-12T04:10:00Z', payer: 'client' },
  { id: 'ad-8', clientId: 'c-shsk', platform: 'meta', accountId: 'SHSK-M', accountName: 'Sahasraa HS - Admissions', allocatedINR: 12000, balanceINR: 5600,  dailySpendINR: 500,  daysRemaining: 11.2, lastSynced: '2026-07-12T04:10:00Z', payer: 'invictus' },
];

// ── SEED: GITHUB ACTIVITY ───────────────────────────────────

export const GITHUB_DEV_ACTIVITY: GitHubDevActivity[] = [
  { userId: 'u-iyyappan', commitsThisWeek: 12, lastCommitAt: '2h ago',    openPRs: 1, mergedPRsThisWeek: 2, blockedTasks: 0 },
  { userId: 'u-veeravel', commitsThisWeek: 6,  lastCommitAt: 'Yesterday', openPRs: 0, mergedPRsThisWeek: 1, blockedTasks: 1 },
  { userId: 'u-naveen',   commitsThisWeek: 3,  lastCommitAt: '3d ago',    openPRs: 0, mergedPRsThisWeek: 0, blockedTasks: 2 },
];

export const GITHUB_REPOS: GitHubRepo[] = [
  { name: 'invictus-os',        clientId: 'c-igt',  commitsThisWeek: 8, lastPushed: '2h ago',    contributors: ['u-iyyappan', 'u-naveen'],   status: 'active' },
  { name: 'pixel-eye-website',  clientId: 'c1',     commitsThisWeek: 4, lastPushed: 'Yesterday', contributors: ['u-veeravel', 'u-iyyappan'], status: 'active' },
  { name: 'rio-hospital-web',   clientId: 'c7',     commitsThisWeek: 2, lastPushed: 'Yesterday', contributors: ['u-iyyappan', 'u-veeravel'], status: 'active' },
  { name: 'whatsnexus',         clientId: null,      commitsThisWeek: 5, lastPushed: '3d ago',    contributors: ['u-naveen', 'u-iyyappan'],   status: 'active' },
];

// ── SEED: LEADS / SALES PIPELINE ────────────────────────────

export const MOCK_LEADS: Lead[] = [
  { 
    id: 'L-001', name: 'Kashmir Eye Hosp', contactPerson: 'Dr. Kashmir', 
    industry: 'Eye care', source: 'Ophthall net', assignedTo: 'u-sushil', score: 78,
    stage: 'proposal', monthlyValueINR: 62000, lastContactDate: '2026-07-03', nextFollowUp: '2026-07-12',
    stageHistory: [{ stage: 'discovery', date: '2026-06-25' }, { stage: 'proposal', date: '2026-07-03' }],
    servicesNeeded: ['smm', 'performance_marketing'],
    smmDeliverables: '12 Videos, 15 Posts',
    brandBrief: {
      goal: 'Increase footfall',
      expectation: '30% more consultations',
      location: 'Bangalore',
      category: 'Eye Care',
      retainer: 50000,
      adBudget: 30000
    },
    priceQuoted: 62000,
    proposalDiscussed: true
  },
  { 
    id: 'L-002', name: 'EyeCare Plus', contactPerson: 'Dr. Mehta', 
    industry: 'Eye care', source: 'Ophthall net', assignedTo: 'u-sushil', score: 81,
    stage: 'proposal', monthlyValueINR: 70000, lastContactDate: '2026-07-07', nextFollowUp: '2026-07-12',
    stageHistory: [{ stage: 'discovery', date: '2026-07-01' }, { stage: 'proposal', date: '2026-07-07' }]
  },
  { 
    id: 'L-003', name: 'Apex Vision', contactPerson: 'Ravindranath', 
    industry: 'Eye care', source: 'Referral', assignedTo: 'u-sushil', score: 72,
    stage: 'revision', monthlyValueINR: 50000, lastContactDate: '2026-06-30', nextFollowUp: '2026-07-10',
    stageHistory: [{ stage: 'discovery', date: '2026-06-15' }, { stage: 'proposal', date: '2026-06-20' }, { stage: 'revision', date: '2026-06-30' }]
  },
  { 
    id: 'L-004', name: 'FitLife Studios', contactPerson: 'Sarah Johnson', 
    industry: 'Fitness', source: 'Meta ad', assignedTo: 'u-tania', score: 55,
    stage: 'discovery', monthlyValueINR: 35000, lastContactDate: '2026-07-12', nextFollowUp: '2026-07-12',
    stageHistory: [{ stage: 'discovery', date: '2026-07-12' }]
  },
  { 
    id: 'L-005', name: 'Priya Vision', contactPerson: 'Dr. Priya', 
    industry: 'Eye care', source: 'Ophthall net', assignedTo: 'u-tania', score: 61,
    stage: 'discovery', monthlyValueINR: 55000, lastContactDate: '2026-07-11', nextFollowUp: '2026-07-15',
    stageHistory: [{ stage: 'discovery', date: '2026-07-11' }]
  },
  { 
    id: 'L-006', name: 'TechFlow Soln', contactPerson: 'TechFlow', 
    industry: 'IT/HRMS', source: 'LinkedIn', assignedTo: 'u-sushil', score: 88,
    stage: 'closing', monthlyValueINR: 120000, lastContactDate: '2026-07-09', nextFollowUp: '2026-07-14',
    stageHistory: [{ stage: 'discovery', date: '2026-06-10' }, { stage: 'proposal', date: '2026-06-25' }, { stage: 'closing', date: '2026-07-09' }]
  },
  { 
    id: 'L-009', name: 'BrightSmile', contactPerson: 'Neha Gupta', 
    industry: 'Dental', source: 'Google ad', assignedTo: 'u-tania', score: 49,
    stage: 'discovery', monthlyValueINR: 40000, lastContactDate: '2026-07-08', nextFollowUp: '2026-07-14',
    stageHistory: [{ stage: 'discovery', date: '2026-07-08' }]
  },
  { 
    id: 'L-010', name: 'TechFlow', contactPerson: 'TechFlow HR', 
    industry: 'IT/HRMS', source: 'LinkedIn', assignedTo: 'u-sushil', score: 70,
    stage: 'proposal', monthlyValueINR: 120000, lastContactDate: '2026-07-05', nextFollowUp: '2026-07-12',
    stageHistory: [{ stage: 'discovery', date: '2026-07-01' }, { stage: 'proposal', date: '2026-07-05' }]
  },
  { 
    id: 'L-011', name: 'Koushik PR', contactPerson: 'Koushik', 
    industry: 'PR', source: 'Cold outreach', assignedTo: 'u-tania', score: 35,
    stage: 'paused', monthlyValueINR: 30000, lastContactDate: '2026-06-15', nextFollowUp: null,
    stageHistory: [{ stage: 'discovery', date: '2026-06-10' }]
  },
  // Won/lost this month
  { 
    id: 'L-007', name: 'Aarav Eye Care', contactPerson: 'Dr. Aarav', 
    industry: 'Eye care', source: 'Ophthall net', assignedTo: 'u-sushil', score: 95,
    stage: 'won', monthlyValueINR: 20000, lastContactDate: '2026-07-05', nextFollowUp: null,
    stageHistory: [{ stage: 'discovery', date: '2026-06-10' }, { stage: 'won', date: '2026-07-05' }]
  },
  { 
    id: 'L-008', name: 'YM Motors', contactPerson: 'Sales Mgr', 
    industry: 'Automotive', source: 'Referral', assignedTo: 'u-tania', score: 40,
    stage: 'lost', monthlyValueINR: 25000, lastContactDate: '2026-06-28', nextFollowUp: null, lostReason: 'Price competition',
    stageHistory: [{ stage: 'discovery', date: '2026-06-20' }, { stage: 'lost', date: '2026-06-28' }]
  },
];

// ── SEED: CAMPAIGN WEEKLY LOGS ──────────────────────────────

export const CAMPAIGN_LOGS: CampaignLog[] = [
  { clientId: 'c1',    clientName: 'Pixel Eye',       channels: ['Google', 'Meta'],      weekLeads: 87, cpl: 415, status: 'good' },
  { clientId: 'c6',    clientName: 'Phoenix Fitness',  channels: ['Meta'],                weekLeads: 39, cpl: 236, status: 'good' },
  { clientId: 'c4',    clientName: 'Antardrashti',     channels: ['Google', 'Meta', 'YT'], weekLeads: 0,  cpl: 0,   status: 'new' },
  { clientId: 'c5',    clientName: 'Aarav Eye',        channels: ['Google'],              weekLeads: 18, cpl: 556, status: 'high' },
  { clientId: 'c7',    clientName: 'Rio Hospital',     channels: ['Google', 'Meta'],      weekLeads: 24, cpl: 340, status: 'ok' },
  { clientId: 'c3',    clientName: 'Optimus Eye',      channels: ['Google', 'Meta'],      weekLeads: 31, cpl: 362, status: 'good' },
  { clientId: 'c2',    clientName: 'Namokar Eye',      channels: ['Google'],              weekLeads: 12, cpl: 290, status: 'good' },
  { clientId: 'c-shsk', clientName: 'Sahasraa HS',     channels: ['Meta'],                weekLeads: 8,  cpl: 180, status: 'good' },
];

// ── SEED: TODAY'S MEETINGS ──────────────────────────────────

export const MEETINGS_TODAY: MeetingEvent[] = [
  {
    id: 'mtg-1',
    title: 'Pixel Eye — Monthly Review',
    clientId: 'c1',
    time: '09:00 AM',
    duration: 30,
    attendee: 'Dr. Abdulrasheed',
    meetLink: 'https://meet.google.com/abc-defg-hij',
    prepNotes: '4 open tasks, last MOM Jun 23',
  },
  {
    id: 'mtg-2',
    title: 'Aarav Eye — Campaign Proof Review',
    clientId: 'c5',
    time: '02:00 PM',
    duration: 45,
    attendee: 'Dr. Aarav',
    meetLink: 'https://meet.google.com/xyz-uvwx-rst',
    prepNotes: '⚠ Proof window closes Jul 17 — 5 days',
  },
];

// ── RE-EXPORT ORIGINAL STUBS (backward compat) ─────────────

export const MEETING_NOTES_SEED: any[] = [];
export const INITIAL_AUDIT_LOG_FULL: any[] = [];


// ── SEED: DEVELOPMENT ───────────────────────────────────────
export const MOCK_COMMITS: GitHubCommit[] = [
  { id: 'c-1', userId: 'u-iyyappan', repo: 'invictus-os', clientId: 'c-igt', taskId: 'TSK-088', message: 'fix: webhook auth bug', additions: 12, deletions: 3, timestamp: '2026-07-12T09:14:00Z', isLive: true },
  { id: 'c-2', userId: 'u-veeravel', repo: 'pixel-eye-website', clientId: 'c1', taskId: 'TSK-015', message: 'feat: LASIK page responsive', additions: 89, deletions: 22, timestamp: '2026-07-12T08:52:00Z' },
  { id: 'c-3', userId: 'u-naveen', repo: 'rio-hospital-web', clientId: 'c7', taskId: null, message: 'update: config change', additions: 4, deletions: 1, timestamp: '2026-07-12T08:30:00Z' },
  { id: 'c-4', userId: 'u-jashwanth', repo: 'sahasraa-landing', clientId: 'c-shsk', taskId: 'TSK-018', message: 'feat: hero section', additions: 124, deletions: 18, timestamp: '2026-07-11T09:45:00Z' },
  { id: 'c-5', userId: 'u-veeravel', repo: 'invictus-os', clientId: 'c-igt', taskId: 'TSK-082', message: 'fix: calendar bug', additions: 45, deletions: 5, timestamp: '2026-07-11T09:20:00Z' },
];

export const MOCK_DEV_PROJECTS: DevProject[] = [
  { id: 'dp-1', repoName: 'invictus-os', clientId: 'c-igt', name: 'Invictus OS platform', commitsThisWeek: 40, developers: ['u-iyyappan', 'u-veeravel', 'u-naveen'], status: 'active', openPRs: 1, openIssues: 4, lastPush: '2h ago', isInternal: true },
  { id: 'dp-2', repoName: 'whatsnexus-api', clientId: 'c-igt', name: 'WhatsNexus backend API', commitsThisWeek: 5, developers: ['u-iyyappan'], status: 'active', openPRs: 0, openIssues: 0, lastPush: '2h ago', isInternal: true },
  { id: 'dp-3', repoName: 'pixel-eye-website', clientId: 'c1', name: 'Website Phase 2', commitsThisWeek: 4, developers: ['u-veeravel', 'u-iyyappan'], status: 'active', openPRs: 0, openIssues: 0, lastPush: 'Yesterday', isInternal: false, progressPercent: 40, estCompletion: 'Aug 15', openTaskIds: ['TSK-015', 'TSK-072'] },
  { id: 'dp-4', repoName: 'rio-hospital-web', clientId: 'c7', name: 'High-risk pregnancy section', commitsThisWeek: 2, developers: ['u-naveen'], status: 'at_risk', openPRs: 0, openIssues: 0, lastPush: '3d ago', isInternal: false, progressPercent: 25, alertMessage: '⚠ Behind schedule — 3d no commits · Naveen blocked on client FTP access' },
  { id: 'dp-5', repoName: 'sahasraa-landing', clientId: 'c-shsk', name: 'Elite-30 landing page', commitsThisWeek: 2, developers: ['u-jashwanth', 'u-veeravel'], status: 'handover', openPRs: 0, openIssues: 0, lastPush: 'Yesterday', isInternal: false, progressPercent: 60, alertMessage: '⚠ Jashwanth exiting Jul 11 — Veeravel must complete' },
  { id: 'dp-6', repoName: 'shanti-eye-website', clientId: 'c-shte', name: 'Responsive changes completed Jun 28', commitsThisWeek: 0, developers: ['u-iyyappan'], status: 'completed', openPRs: 0, openIssues: 0, lastPush: 'Jun 28', isInternal: false, progressPercent: 100 },
];

export const MOCK_AD_RECHARGES: AdRechargeEvent[] = [
  { id: 'ar-1', date: '2026-07-01T10:00:00Z', clientId: 'c1', platform: 'google', amountINR: 68000, recharger: 'client', method: 'auto' },
  { id: 'ar-2', date: '2026-07-01T10:00:00Z', clientId: 'c6', platform: 'meta', amountINR: 35000, recharger: 'client', method: 'manual', loggedBy: 'u-abhilash' },
  { id: 'ar-3', date: '2026-07-05T10:00:00Z', clientId: 'c7', platform: 'google', amountINR: 22400, recharger: 'client', method: 'auto' },
  { id: 'ar-4', date: '2026-06-30T10:00:00Z', clientId: 'c6', platform: 'meta', amountINR: 18000, recharger: 'invictus', method: 'manual', loggedBy: 'u-abhilash' },
  { id: 'ar-5', date: '2026-06-25T10:00:00Z', clientId: 'c1', platform: 'meta', amountINR: 22000, recharger: 'client', method: 'auto' },
];
