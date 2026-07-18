// ============================================================
// INVICTUS OS — Master Data Store v3
// All mock data. Replace with PostgreSQL queries when ready.
// ============================================================

// Re-export dashboard types for consumers
export type { AttendanceLog, AdAccountBalance, GitHubDevActivity, GitHubRepo, Lead, CampaignLog, MeetingEvent, GitHubCommit, AdRechargeEvent, DevProject, SocialAccount } from './seed_meetings';

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'paused' | 'rework' | 'in_review' | 'blocked' | 'done' | 'cancelled';
export type TaskCategory =
  | 'performance_marketing'
  | 'social_media'
  | 'video_editing'
  | 'design_creative'
  | 'web_development'
  | 'whatsapp_automation'
  | 'strategy'
  | 'operations'
  | 'content_writing'
  | 'seo';

export type RoleTag =
  | 'video_editor'
  | 'designer'
  | 'performance_marketer'
  | 'web_developer'
  | 'ai_developer'
  | 'developer'
  | 'ops'
  | 'sales'
  | 'leadership';

export interface Notification {
  id: string;
  userId: string; // The recipient
  actorId: string; // The person who triggered it
  type: 'mention' | 'status_change' | 'assignment';
  taskId: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO timestamp
}

export interface Campaign {
  id: string;
  clientId: string;
  name: string;                   // "LASIK: Break Up With Glasses"
  platform: 'google' | 'meta' | 'youtube' | 'jio_hotstar' | 'linkedin' | 'other';
  status: 'live' | 'paused' | 'pending' | 'problem' | 'ended';
  objective: string;              // "lead_generation" | "brand_awareness" | "traffic"
  assignedTo: string[];           // team member IDs
  monthlyBudgetINR: number;
  adAccountId: string;            // platform account ID
  landingPageUrl?: string;
  creativeTaskIds: string[];      // linked task IDs
  startDate: string;
  endDate?: string;
  weeklyLogs: string[];           // CampaignWeeklyLog IDs
  notes: string;
  // Performance Marketing Metrics
  cpl?: number;
  cpm?: number;
  conversions?: number;
  impressions?: number;
  policyIssues?: string[];
  pausedAt?: string;
}

export interface CampaignWeeklyLog2 {
  id: string;
  campaignId: string;
  weekStarting: string; // ISO Date string
  impressions: number;
  clicks: number;
  spendINR: number;
  leads: number;
}

// ─────────────────────────────────────────────────────────────
// TIME ENTRY LEDGER (v3 — the source of truth for all analytics)
// ─────────────────────────────────────────────────────────────
export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;       // WHO logged it — critical for multi-assignee tasks
  startedAt: string;    // ISO timestamp
  endedAt: string;      // ISO timestamp
  minutes: number;      // computed: Math.floor((endedAt - startedAt) / 60000)
  source: 'timer' | 'manual';
  note?: string;
  migrated?: boolean;   // true = synthesized from v2 aggregate on upgrade
}

export interface TaskApproval {
  id: string;
  requestedBy: string;
  approver: string;
  type: 'budget' | 'task_completion' | 'self_assignment' | 'time_log';
  status: 'pending' | 'approved' | 'rejected';
  requestMessage?: string;
  responseMessage?: string;
  meta?: any;
}

export interface Task {
  id: string;
  clientId: string;
  title: string;
  description: string;
  category: TaskCategory;
  assignedTo: string[];
  createdBy: string;
  priority: Priority;
  status: TaskStatus;

  // Hierarchical tasks
  type?: 'goal' | 'task' | 'subtask';
  parentId?: string;

  // Assets & Submission
  requiresAsset?: boolean;
  submissionNotes?: string;
  assets?: { name: string; url: string }[];

  // Review Cycle
  reviewComments?: {
    id: string;
    authorId: string;
    text: string;
    createdAt: string;
    rejectionReason?: 'brief_unclear' | 'brand_mismatch' | 'quality' | 'client_changed_mind';
  }[];

  // Time and Date
  startTime?: string;       // ISO date string for hour-based Gantt
  deadline: string | null;  // ISO date string
  estimatedHours: number;
  loggedMinutes: number;    // cached display total; ledger is source of truth

  // Completion tracking (v3 — set ONCE on → done; cleared on reopen)
  completedAt?: string;     // ISO timestamp
  completedBy?: string;     // userId

  // Task subtype (v3 — for production analytics)
  taskType?: string;        // e.g. 'poster', 'reel_edit', 'landing_page'

  // Shoot-specific (nullable except on shoot tasks)
  shootDate?: string;
  location?: string;
  freelancerName?: string;
  freelancerFeeINR?: number;
  footageUsability?: 'usable' | 'partial' | 'unusable';
  usabilityReason?: 'shake' | 'lighting' | 'audio' | 'framing';

  // Approvals
  approvals?: TaskApproval[];

  createdAt: string;
  updatedAt: string;
  tags: string[];
  dependencies?: string[];
}

export interface Client {
  id: string;
  code: string;
  name: string;
  category: string;
  monthlyRetainerINR: number;
  agencyFeeINR: number;
  contractStatus: 'active' | 'paused' | 'churned';
  clientStatus?: 'active' | 'on_hold' | 'at_risk' | 'churned';
  onHoldReason?: string;
  lastClientContactAt?: string;
  primaryContact: string;
  notes: string;
  budgetUtilization?: number;
  color?: string;
  website?: string;
  isInternal?: boolean; // WhatsNexus, HAGGLE, Invictus internal = true
}

export interface ClientMonthlyMetrics {
  id: string;
  clientId: string;
  month: string; // e.g. '2026-07'
  servicesOffered: string[];
  budgetAllocated: number;
  budgetSpent: number;
  leadsGenerated: number;
  costPerLead: number;
  conversions: number;
  roas: number;
  timeEstimateMinutes?: number;
  estimatedHours?: number;
  dependencies?: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  title?: string;
  role: 'super_admin' | 'admin' | 'ops' | 'team' | 'member' | 'viewer';
  department: string;
  initials: string;
  hoursThisWeek: number;
  weeklyTarget: number;
  color: string;
  permissions: string[];
  monthlySalaryINR: number; // v3 — real salary for cost analytics
  roleTag: RoleTag;         // v3 — for role-specific analytics views
  isHeadOfDepartment?: boolean; // v3 — for notification routing
  password?: string; // Phase 12 - User credentials (mock)
  mustChangePassword?: boolean; // Forces password change on first login
  
  // Profile Extended Info
  phoneNumber?: string;
  emergencyContact?: string;
  employeeId?: string;
  dateJoined?: string;
  averageWorkTime?: string; // e.g., "9:30 AM - 6:30 PM"
  currentScore?: number; // Out of 100 or 10
  leavesTaken?: number;
  leavesAvailable?: number;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorId: string;
  action: string;
  entity: string;
  entityRef: string;
  clientName: string;
  meta: string;
}

export interface Deliverable {
  id: string;
  clientId: string;
  title: string;
  status: 'pending' | 'in_progress' | 'done';
  dueDate: string;
}

export interface ClientCredential {
  id: string;
  clientId: string;
  platform: 'instagram' | 'youtube' | 'facebook' | 'website' | 'hosting';
  username: string;
  passwordStr: string;
  url?: string;
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  clientId: string;
  cycleMonth: string; // e.g. "2026-07"
  invoiceNumber: string;
  amountDue: number;
  amountPaid: number;
  dueDate: string;
  paidDate?: string;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
  overduedays: number; // computed: today - dueDate
  reminderSentAt?: string;
}

export interface SocialMetric {
  id: string;
  clientId: string;
  platform: 'instagram' | 'youtube';
  followers: number;
  reach: number;
  engagementRate: number;
  views?: number;
  watchTimeHours?: number;
  lastUpdated: string;
}

// ─────────────────────────────────────────────────────────────
// TASK TYPE OPTIONS — per category, for NewTaskModal dropdown
// ─────────────────────────────────────────────────────────────
export const TASK_TYPE_OPTIONS: Record<TaskCategory, string[]> = {
  design_creative: ['poster', 'carousel', 'story', 'ad_creative', 'logo', 'branding_kit', 'ui_mockup', 'landing_page_design', 'deck', 'revision_round'],
  video_editing:   ['reel_edit', 'long_form_edit', 'raw_cut', 'motion_graphics', 'subtitles', 'thumbnail', 'revision_round'],
  web_development: ['landing_page', 'full_site', 'feature', 'bug_fix', 'maintenance', 'speed_optimization', 'integration'],
  performance_marketing: ['campaign_setup', 'optimization_pass', 'report', 'audience_research', 'ad_copy', 'landing_qa'],
  social_media:    ['post_batch', 'calendar_planning', 'engagement', 'caption_writing'],
  whatsapp_automation: ['product_feature', 'product_bug', 'client_onboarding', 'integration', 'infra'],
  strategy: ['planning', 'research', 'consultation'],
  operations: ['admin', 'meeting', 'hr', 'finance'],
  content_writing: ['blog_post', 'copywriting', 'script', 'newsletter'],
  seo: ['audit', 'keyword_research', 'on_page', 'backlinking']
};

// ─────────────────────────────────────────────────────────────
// TASK TYPE BENCHMARKS — target hours per subtype (admin-editable)
// ─────────────────────────────────────────────────────────────
export const DEFAULT_BENCHMARKS: Record<string, number> = {
  poster: 1.5, carousel: 2.5, story: 0.75, ad_creative: 2,
  logo: 8, ui_mockup: 4, landing_page_design: 4,
  reel_edit: 3, long_form_edit: 8, raw_cut: 2, thumbnail: 0.75, subtitles: 1,
  landing_page: 16, bug_fix: 3, feature: 12, speed_optimization: 6,
};

export const TASK_TYPE_LABELS: Record<string, string> = {
  poster: 'Poster', carousel: 'Carousel', story: 'Story', ad_creative: 'Ad Creative',
  logo: 'Logo', brand_kit: 'Brand Kit', ui_mockup: 'UI Mockup', landing_page_design: 'LP Design', thumbnail: 'Thumbnail',
  reel_edit: 'Reel Edit', long_form_edit: 'Long-Form Edit', raw_cut: 'Raw Cut', motion_graphics: 'Motion Graphics',
  subtitles: 'Subtitles', revision_round: 'Revision Round',
  landing_page: 'Landing Page', full_site: 'Full Site', feature: 'Feature', bug_fix: 'Bug Fix',
  maintenance: 'Maintenance', speed_optimization: 'Speed Optimization', integration: 'Integration',
  campaign_setup: 'Campaign Setup', optimization_pass: 'Optimization Pass', report: 'Report',
  audience_research: 'Audience Research', ad_copy: 'Ad Copy', landing_qa: 'Landing QA',
  post_batch: 'Post Batch', calendar_planning: 'Calendar Planning', engagement: 'Engagement', caption_writing: 'Caption Writing',
  product_feature: 'Product Feature', product_bug: 'Product Bug', client_onboarding: 'Client Onboarding',
  infra: 'Infrastructure',
};

// ─────────────────────────────────────────────────────────────
// TEAM MEMBERS — with real salaries and roleTags (v3)
// ─────────────────────────────────────────────────────────────
export const TEAM_MEMBERS: TeamMember[] = [
  { id: 'u-sushil', name: 'Sushil Athithiyaa', email: 'sushilathithiyaa@invictusglobaltech.com', role: 'super_admin', department: 'Leadership', initials: 'SA', hoursThisWeek: 45, weeklyTarget: 50, color: 'bg-primary', permissions: ['all'], monthlySalaryINR: 40000, roleTag: 'leadership', isHeadOfDepartment: true, password: 'Invictus2026', mustChangePassword: true, phoneNumber: '+91 9876543210', emergencyContact: '+91 9988776655', employeeId: 'EMP-001', dateJoined: '2023-01-15', averageWorkTime: '9:00 AM - 6:00 PM', currentScore: 9.5, leavesTaken: 4, leavesAvailable: 12 },
  { id: 'u-anitha', name: 'Anitha Yogan', email: 'contact@invictusglobaltech.com', role: 'admin', department: 'Leadership', initials: 'AY', hoursThisWeek: 42, weeklyTarget: 45, color: 'bg-emerald-500', permissions: ['manage_ops'], monthlySalaryINR: 30000, roleTag: 'ops', isHeadOfDepartment: true, password: 'Invictus2026', mustChangePassword: true, phoneNumber: '+91 9876543211', emergencyContact: '+91 9988776656', employeeId: 'EMP-002', dateJoined: '2023-03-01', averageWorkTime: '9:30 AM - 6:30 PM', currentScore: 9.0, leavesTaken: 2, leavesAvailable: 14 },
  { id: 'u-abhilash', name: 'Abhilash B Nair', email: 'connect@invictusglobaltech.com', role: 'ops', department: 'Operations', initials: 'AB', hoursThisWeek: 40, weeklyTarget: 45, color: 'bg-orange-500', permissions: ['manage_ops'], monthlySalaryINR: 25000, roleTag: 'ops', isHeadOfDepartment: true, password: 'Invictus2026', mustChangePassword: true, employeeId: 'EMP-003' },
  { id: 'u-aiswarya', name: 'Aiswarya Saiju', email: 'aiswarya.saiju.igt@gmail.com', role: 'team', department: 'Performance Marketing', initials: 'AS', hoursThisWeek: 35, weeklyTarget: 40, color: 'bg-pink-500', permissions: ['manage_marketing'], monthlySalaryINR: 20000, roleTag: 'performance_marketer', password: 'Invictus2026', mustChangePassword: true, employeeId: 'EMP-011' },
  { id: 'u-anju', name: 'Anju S', email: 'abhilash.igt@gmail.com', role: 'team', department: 'Performance Marketing', initials: 'AJ', hoursThisWeek: 32, weeklyTarget: 40, color: 'bg-rose-500', permissions: ['manage_marketing'], monthlySalaryINR: 15000, roleTag: 'performance_marketer', password: 'Invictus2026', mustChangePassword: true, employeeId: 'EMP-012' },
  { id: 'u-rutuja', name: 'Rutuja Rajbhar', email: 'rutuja.rajbhar.igt@gmail.com', role: 'team', department: 'Performance Marketing', initials: 'RU', hoursThisWeek: 36, weeklyTarget: 40, color: 'bg-teal-500', permissions: ['manage_marketing'], monthlySalaryINR: 20000, roleTag: 'performance_marketer', password: 'Invictus2026', mustChangePassword: true, employeeId: 'EMP-013' },
  { id: 'u-karan', name: 'Karan K', email: 'karankumar.igt@gmail.com', role: 'team', department: 'Design', title: 'Creative Head — Design', initials: 'KA', hoursThisWeek: 39, weeklyTarget: 40, color: 'bg-violet-500', permissions: ['manage_design'], monthlySalaryINR: 25000, roleTag: 'designer', isHeadOfDepartment: true, password: 'Invictus2026', mustChangePassword: true, employeeId: 'EMP-004' },
  { id: 'u-basheer', name: 'Basheer', email: 'basheerinvictus@gmail.com', role: 'team', department: 'Video', title: 'Creative Head — Video', initials: 'BA', hoursThisWeek: 38, weeklyTarget: 40, color: 'bg-blue-500', permissions: ['manage_video'], monthlySalaryINR: 30000, roleTag: 'video_editor', isHeadOfDepartment: true, password: 'Invictus2026', mustChangePassword: true, employeeId: 'EMP-009' },
  { id: 'u-pranesh', name: 'Pranesh Krishnan', email: 'praneshkrishnan.igt@gmail.com', role: 'team', department: 'Video', title: 'Video Editor Associate', initials: 'PK', hoursThisWeek: 41, weeklyTarget: 40, color: 'bg-indigo-500', permissions: ['manage_video'], monthlySalaryINR: 35000, roleTag: 'video_editor', password: 'Invictus2026', mustChangePassword: true, employeeId: 'EMP-010' },
  { id: 'u-iyyappan', name: 'Iyyappan', email: 'iyyappan.igt@gmail.com', role: 'team', department: 'Development', title: 'Associate Developer', initials: 'IY', hoursThisWeek: 44, weeklyTarget: 40, color: 'bg-cyan-500', permissions: ['manage_dev'], monthlySalaryINR: 25000, roleTag: 'ai_developer', password: 'Invictus2026', mustChangePassword: true, employeeId: 'EMP-006' },
  { id: 'u-naveen', name: 'Naveen Raj', email: 'naveenraj.igt@gmail.com', role: 'team', department: 'Development', title: 'Head of Development', initials: 'NR', hoursThisWeek: 40, weeklyTarget: 40, color: 'bg-sky-500', permissions: ['manage_dev'], monthlySalaryINR: 20000, roleTag: 'developer', isHeadOfDepartment: true, password: 'Invictus2026', mustChangePassword: true, employeeId: 'EMP-008' },
  { id: 'u-veeravel', name: 'Veeravel S', email: 'veeravel.igt@gmail.com', role: 'team', department: 'Development', title: 'Web Developer', initials: 'VE', hoursThisWeek: 38, weeklyTarget: 40, color: 'bg-fuchsia-500', permissions: ['manage_dev'], monthlySalaryINR: 20000, roleTag: 'web_developer', password: 'Invictus2026', mustChangePassword: true, employeeId: 'EMP-007' },
  { id: 'u-tania', name: 'Tania Viquar', email: 'tania.viquar.igt@gmail.com', role: 'team', department: 'Sales', title: 'BDE / Sales', initials: 'TV', hoursThisWeek: 20, weeklyTarget: 30, color: 'bg-amber-500', permissions: ['view_ops'], monthlySalaryINR: 8000, roleTag: 'sales', password: 'Invictus2026', mustChangePassword: true, employeeId: 'EMP-014' },
  { id: 'u-dikshita', name: 'Dikshita Rajpurohit', email: 'dikshitarajpurohit.igt@gmail.com', role: 'team', department: 'Marketing', title: 'Role TBD', initials: 'DR', hoursThisWeek: 0, weeklyTarget: 40, color: 'bg-lime-500', permissions: [], monthlySalaryINR: 15000, roleTag: 'performance_marketer', password: 'Invictus2026', mustChangePassword: true, employeeId: 'EMP-015' },
  { id: 'u-thariq', name: 'Mohammad Thariq', email: 'thariq.dev@gmail.com', role: 'ops', department: 'Development', title: 'CTO', initials: 'MT', hoursThisWeek: 30, weeklyTarget: 40, color: 'bg-slate-500', permissions: ['manage_dev'], monthlySalaryINR: 30000, roleTag: 'developer', password: 'Invictus2026', mustChangePassword: true, employeeId: 'EMP-016' },
];

// ─────────────────────────────────────────────────────────────
// CLIENTS
// ─────────────────────────────────────────────────────────────
export const CLIENTS: Client[] = [
  { id: 'c1',  code: 'PXLE', name: 'Pixel Eye Hospital',           category: 'Eye Care',     monthlyRetainerINR: 62099, agencyFeeINR: 15000, contractStatus: 'active', primaryContact: 'Dr. Arun Kumar',    notes: 'Very responsive. WhatsApp preferred. Monthly call every 1st Monday. Expanding to Lucknow.', budgetUtilization: 65, color: '#0EA5E9' },
  { id: 'c2',  code: 'NMKR', name: 'Namokar Eye & Oculoplasty',   category: 'Eye Care',     monthlyRetainerINR: 30000, agencyFeeINR: 5000,  contractStatus: 'active', primaryContact: 'Dr. Namokar',       notes: 'Multiple overdue tasks. Needs urgent attention. Q3 deck delayed.', budgetUtilization: 88, color: '#8B5CF6' },
  { id: 'c3',  code: 'OPMS', name: 'Optimus Eye Hospital',         category: 'Eye Care',     monthlyRetainerINR: 58000, agencyFeeINR: 12000, contractStatus: 'active', primaryContact: 'Dr. Rajan',         notes: 'Website underway. Lucknow video shoot needs coordinating urgently.', budgetUtilization: 72, color: '#10B981' },
  { id: 'c4',  code: 'ANTR', name: 'Antardrashti Netralaya',       category: 'Eye Care',     monthlyRetainerINR: 20000, agencyFeeINR: 5000,  contractStatus: 'active', primaryContact: 'Dr. Shankar',       notes: 'Campaign launch critical. Previously paused — restarting July.', budgetUtilization: 95, color: '#F59E0B' },
  { id: 'c5',  code: 'AARV', name: 'Aarav Eye Care',               category: 'Eye Care',     monthlyRetainerINR: 20000, agencyFeeINR: 5000,  contractStatus: 'active', primaryContact: 'Dr. Aarav',         notes: 'Need proof of results report urgently. Client questioning value.', budgetUtilization: 30, color: '#EC4899' },
  { id: 'c6',  code: 'PHNX', name: 'Phoenix Fitness',              category: 'Fitness',      monthlyRetainerINR: 44000, agencyFeeINR: 10000, contractStatus: 'active', primaryContact: 'Fitness Director',  notes: 'Two campaigns running simultaneously. July social posts in progress.', budgetUtilization: 50, color: '#E11D48' },
  { id: 'c7',  code: 'RIOC', name: "Rio Children's Hospital",      category: 'Healthcare',   monthlyRetainerINR: 40000, agencyFeeINR: 10000, contractStatus: 'active', primaryContact: 'Admin Team',        notes: 'High-risk pregnancy section needs to go live. Lead tracking urgent.', budgetUtilization: 78, color: '#6366F1' },
  { id: 'c8',  code: 'VLSL', name: 'VLS / BLS Law Academy',        category: 'EdTech',       monthlyRetainerINR: 25000, agencyFeeINR: 8000,  contractStatus: 'active', primaryContact: 'Admission Head',    notes: 'Steady client. No major concerns this month.', budgetUtilization: 40, color: '#14B8A6' },
  { id: 'c9',  code: 'OFTH', name: 'Oftal / Ophthall',             category: 'Eye Care',     monthlyRetainerINR: 0,     agencyFeeINR: 0,     contractStatus: 'active', primaryContact: 'Dr. Oftal',         notes: 'New client, no retainer yet.', budgetUtilization: 20, color: '#3B82F6' },
  { id: 'c10', code: 'YMMR', name: 'YM Motors',                    category: 'Automotive',   monthlyRetainerINR: 0,     agencyFeeINR: 0,     contractStatus: 'active', primaryContact: 'Sales Manager',     notes: 'Early stage.', budgetUtilization: 0, color: '#F97316' },
  { id: 'c11', code: 'MPMC', name: 'MPM Constructions',            category: 'Construction', monthlyRetainerINR: 0,     agencyFeeINR: 0,     contractStatus: 'active', primaryContact: 'MD Office',         notes: 'Early stage.', budgetUtilization: 0, color: '#84CC16' },
  { id: 'c12', code: 'SJTN', name: 'Sujit Annan',                  category: 'Eye Care',     monthlyRetainerINR: 0,     agencyFeeINR: 0,     contractStatus: 'active', primaryContact: 'Sujit Annan',       notes: 'Personal account.', budgetUtilization: 0, color: '#06B6D4' },
  { id: 'c-shte', code: 'SHTE', name: 'Shanti Eye Tech', category: 'Eye Care', monthlyRetainerINR: 0, agencyFeeINR: 0, contractStatus: 'active', primaryContact: 'TBC', notes: 'Veeravel completed responsive changes Jun 28. Client relationship exists — revenue to be confirmed.', budgetUtilization: 0, color: '#06B6D4' },
  { id: 'c-shsk', code: 'SHSK', name: 'Sahasraa High School', category: 'EdTech', monthlyRetainerINR: 0, agencyFeeINR: 0, contractStatus: 'active', primaryContact: 'TBC', notes: 'Elite-30 Admissions campaign + landing page in progress. Started by Jashwanth (now exited). Revenue TBC.', budgetUtilization: 0, color: '#8B5CF6' },
  { id: 'c-igt', code: 'IGTI', name: 'Invictus Internal', category: 'Internal', monthlyRetainerINR: 0, agencyFeeINR: 0, contractStatus: 'active', primaryContact: 'Sushil', notes: 'Internal tasks.', budgetUtilization: 0, color: '#2AB182', isInternal: true },
];

// ─────────────────────────────────────────────────────────────
// TASKS — with taskType, completedAt seeded on done tasks
// ─────────────────────────────────────────────────────────────
export const INITIAL_TASKS: Task[] = [];

// ─────────────────────────────────────────────────────────────
// SEED TIME ENTRIES for analytics (v3 — realistic history)
// ─────────────────────────────────────────────────────────────
export const SEED_TIME_ENTRIES: TimeEntry[] = [];

// ─────────────────────────────────────────────────────────────
// DELIVERABLES (per client)
// ─────────────────────────────────────────────────────────────
export const DELIVERABLES: Record<string, Deliverable[]> = {
  c1: [
    { id: 'd1-1', clientId: 'c1', title: '4x Reels — July Batch', status: 'in_progress', dueDate: '2026-07-15' },
    { id: 'd1-2', clientId: 'c1', title: 'Performance Report — June', status: 'pending', dueDate: '2026-07-12' },
    { id: 'd1-3', clientId: 'c1', title: 'WhatsNexus Lead Setup', status: 'in_progress', dueDate: '2026-07-10' },
    { id: 'd1-4', clientId: 'c1', title: 'Google Ads Optimization', status: 'done', dueDate: '2026-07-05' },
    { id: 'd1-5', clientId: 'c1', title: 'Monthly Social Posts x12', status: 'done', dueDate: '2026-07-01' },
  ],
  c3: [
    { id: 'd3-1', clientId: 'c3', title: 'Website — 6 Service Pages', status: 'in_progress', dueDate: '2026-07-18' },
    { id: 'd3-2', clientId: 'c3', title: 'Lucknow Doctor Video', status: 'pending', dueDate: '2026-07-11' },
    { id: 'd3-3', clientId: 'c3', title: 'Meta + Google — July', status: 'in_progress', dueDate: '2026-07-14' },
  ],
};

// ─────────────────────────────────────────────────────────────
// CREDENTIALS & SOCIAL METRICS
// ─────────────────────────────────────────────────────────────
export const CREDENTIALS: ClientCredential[] = [
  { id: 'cred1', clientId: 'c1', platform: 'instagram', username: '@pixeleye', passwordStr: 'PxL#2026!secure', url: 'https://instagram.com/pixeleye' },
  { id: 'cred2', clientId: 'c1', platform: 'website', username: 'admin', passwordStr: 'WP_Pixel_9912', url: 'https://pixeleye.com/wp-admin' },
  { id: 'cred3', clientId: 'c6', platform: 'instagram', username: '@phoenix_fit', passwordStr: 'Phx!Fit$2026', url: 'https://instagram.com/phoenix_fit' },
  { id: 'cred4', clientId: 'c6', platform: 'youtube', username: 'Phoenix Fitness Official', passwordStr: 'YT_Phx_2026', url: 'https://youtube.com/@phoenix_fit' },
  { id: 'cred5', clientId: 'c3', platform: 'hosting', username: 'optimus_host', passwordStr: 'Optimus@Host77!', url: 'https://cpanel.optimuseye.com' },
];

export const SOCIAL_METRICS: SocialMetric[] = [
  { id: 'sm1', clientId: 'c1', platform: 'instagram', followers: 12500, reach: 45000, engagementRate: 4.2, lastUpdated: '2026-07-09T08:00:00Z' },
  { id: 'sm2', clientId: 'c6', platform: 'instagram', followers: 28400, reach: 112000, engagementRate: 6.8, lastUpdated: '2026-07-09T08:05:00Z' },
  { id: 'sm3', clientId: 'c6', platform: 'youtube', followers: 15200, reach: 0, engagementRate: 8.5, views: 350000, watchTimeHours: 12000, lastUpdated: '2026-07-09T08:05:00Z' },
  { id: 'sm4', clientId: 'c2', platform: 'instagram', followers: 8200, reach: 21000, engagementRate: 3.1, lastUpdated: '2026-07-09T08:10:00Z' },
  { id: 'sm5', clientId: 'c3', platform: 'instagram', followers: 14500, reach: 52000, engagementRate: 5.2, lastUpdated: '2026-07-09T08:15:00Z' },
  { id: 'sm6', clientId: 'c4', platform: 'instagram', followers: 5100, reach: 18000, engagementRate: 4.5, lastUpdated: '2026-07-09T08:20:00Z' },
  { id: 'sm7', clientId: 'c5', platform: 'instagram', followers: 2200, reach: 8000, engagementRate: 2.1, lastUpdated: '2026-07-09T08:25:00Z' },
  { id: 'sm8', clientId: 'c7', platform: 'instagram', followers: 18900, reach: 67000, engagementRate: 6.1, lastUpdated: '2026-07-09T08:30:00Z' },
  { id: 'sm9', clientId: 'c8', platform: 'instagram', followers: 4500, reach: 15000, engagementRate: 3.8, lastUpdated: '2026-07-09T08:35:00Z' },
  { id: 'sm10', clientId: 'c9', platform: 'instagram', followers: 1200, reach: 4000, engagementRate: 7.2, lastUpdated: '2026-07-09T08:40:00Z' },
  { id: 'sm11', clientId: 'c10', platform: 'instagram', followers: 3800, reach: 12000, engagementRate: 4.9, lastUpdated: '2026-07-09T08:45:00Z' },
  { id: 'sm12', clientId: 'c11', platform: 'instagram', followers: 1500, reach: 3500, engagementRate: 2.8, lastUpdated: '2026-07-09T08:50:00Z' },
  { id: 'sm13', clientId: 'c12', platform: 'youtube', followers: 8900, reach: 0, engagementRate: 6.5, views: 120000, watchTimeHours: 4500, lastUpdated: '2026-07-09T08:55:00Z' },
  { id: 'sm14', clientId: 'c-shte', platform: 'instagram', followers: 4100, reach: 16000, engagementRate: 4.1, lastUpdated: '2026-07-09T09:00:00Z' },
  { id: 'sm15', clientId: 'c-shsk', platform: 'instagram', followers: 9800, reach: 34000, engagementRate: 5.7, lastUpdated: '2026-07-09T09:05:00Z' },
  { id: 'sm16', clientId: 'c-igt', platform: 'youtube', followers: 5600, reach: 0, engagementRate: 4.8, views: 80000, watchTimeHours: 3200, lastUpdated: '2026-07-09T09:10:00Z' },
];

// ─────────────────────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────────────────────
export const INITIAL_AUDIT_LOG: AuditEntry[] = [];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
export function getClientById(id: string): Client | undefined {
  return CLIENTS.find(c => c.id === id);
}

export function getMemberById(id: string): TeamMember | undefined {
  return TEAM_MEMBERS.find(m => m.id === id);
}

export function getMembersByIds(ids: string[]): TeamMember[] {
  return ids.map(id => TEAM_MEMBERS.find(m => m.id === id)).filter(Boolean) as TeamMember[];
}

export function formatMinutes(minutes: number): string {
  if (minutes === 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function isOverdue(task: Task): boolean {
  if (!task.deadline || task.status === 'done') return false;
  return new Date(task.deadline) < new Date(new Date().toDateString());
}

export function isDueToday(task: Task): boolean {
  if (!task.deadline || task.status === 'done') return false;
  return task.deadline === new Date().toISOString().split('T')[0];
}

/** Hourly cost of a team member (salary / 176 working hours/month) */
export function getHourlyCost(member: TeamMember): number {
  return Math.round(member.monthlySalaryINR / 176);
}

export const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: '#EF4444', bg: 'rgba(239,68,68,0.25)', textClass: 'text-red-500' },
  high:     { label: 'High',     color: '#8B5CF6', bg: 'rgba(139,92,246,0.25)', textClass: 'text-purple-500' },
  medium:   { label: 'Medium',   color: '#F59E0B', bg: 'rgba(245,158,11,0.25)', textClass: 'text-amber-500' },
  low:      { label: 'Low',      color: '#94A3B8', bg: 'rgba(148,163,184,0.25)', textClass: 'text-slate-400' },
};

export const STATUS_CONFIG = {
  todo:        { label: 'To Do',       color: '#64748B', bg: 'rgba(100,116,139,0.1)' },
  in_progress: { label: 'In Progress', color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  paused:      { label: 'Paused',      color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
  rework:      { label: 'Rework',      color: '#DB2777', bg: 'rgba(219,39,119,0.1)' },
  in_review:   { label: 'In Review',   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  blocked:     { label: 'Blocked',     color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  done:        { label: 'Done',        color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  cancelled:   { label: 'Cancelled',   color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' },
};

export function calculateTaskProgress(task: Task, allTasks: Task[]): number {
  const subtasks = allTasks.filter(t => t.parentId === task.id);
  if (subtasks.length > 0) {
    const completedSubtasks = subtasks.filter(t => t.status === 'done').length;
    return Math.round((completedSubtasks / subtasks.length) * 100);
  }
  if (task.status === 'done') return 100;
  if (!task.estimatedHours) return 0;
  return Math.min(100, Math.round((task.loggedMinutes / (task.estimatedHours * 60)) * 100));
}

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  performance_marketing: 'Performance Marketing',
  social_media: 'Social Media',
  video_editing: 'Video Editing',
  design_creative: 'Design & Creative',
  web_development: 'Web Development',
  whatsapp_automation: 'WhatsApp Automation',
  strategy: 'Strategy',
  operations: 'Operations',
  content_writing: 'Content Writing',
  seo: 'SEO',
};

export const CATEGORY_COLORS: Record<TaskCategory, string> = {
  performance_marketing: '#F97316',
  social_media: '#06B6D4',
  video_editing: '#8B5CF6',
  design_creative: '#EC4899',
  web_development: '#3B82F6',
  whatsapp_automation: '#10B981',
  strategy: '#F59E0B',
  operations: '#64748B',
  content_writing: '#A78BFA',
  seo: '#34D399',
};

export const NAV_SECTIONS = [
  { href: '/dashboard',             label: 'Agency Overview',     icon: 'insights',              color: 'var(--c-primary)', section: 'dashboard' },
  { href: '/dashboard/coo',         label: 'COO Dashboard',       icon: 'admin_panel_settings',  color: 'var(--c-primary)', section: 'dashboard' },
  { href: '/dashboard/ops',         label: 'Ops Dashboard',       icon: 'grid_view',             color: 'var(--c-primary)', section: 'dashboard' },
  { href: '/dashboard/developer',   label: 'Dev Dashboard',       icon: 'terminal',              color: 'var(--c-primary)', section: 'dashboard' },
  { href: '/dashboard/designer',    label: 'Design Dashboard',    icon: 'brush',                 color: 'var(--c-primary)', section: 'dashboard' },
  { href: '/dashboard/video-editor',label: 'Video Dashboard',     icon: 'movie',                 color: 'var(--c-primary)', section: 'dashboard' },
  { href: '/dashboard/marketer',    label: 'Marketer Dashboard',  icon: 'campaign',              color: 'var(--c-primary)', section: 'dashboard' },
  { href: '/dashboard/sales',       label: 'Sales Dashboard',     icon: 'show_chart',            color: 'var(--c-primary)', section: 'dashboard' },
  { href: '/dashboard/team',        label: 'Team Dashboard',      icon: 'group',                 color: 'var(--c-primary)', section: 'dashboard' },
  { href: '/dashboard/ai-developer',label: 'AI Dev Dashboard',    icon: 'smart_toy',             color: 'var(--c-primary)', section: 'dashboard' },
  { href: '/sales',                 label: 'Sales Pipeline',      icon: 'point_of_sale',         color: 'var(--c-primary)', section: 'sales' },
  { href: '/my-workspace',   label: 'My Workspace',      icon: 'person',                color: 'var(--c-primary)', section: 'my-workspace' },
  { href: '/tasks',          label: 'Tasks',             icon: 'check_box',             color: 'var(--c-primary)', section: 'tasks' },
  { href: '/my-profile',     label: 'My Profile',        icon: 'person',                color: 'var(--c-primary)', section: 'my-profile' },
  { href: '/calendar', label: 'Calendar', icon: 'calendar_month', color: 'var(--c-primary)', section: 'calendar' },
  { href: '/clients',        label: 'Clients',           icon: 'business_center',       color: 'var(--c-primary)', section: 'clients' },
  { href: '/marketing',      label: 'Performance Marketing', icon: 'campaign',          color: 'var(--c-primary)', section: 'marketing' },
  { href: '/campaigns',      label: 'Campaigns',         icon: 'campaign',              color: 'var(--c-primary)', section: 'campaigns' },
  { href: '/ad-budget',      label: 'Ad Budget',         icon: 'account_balance',       color: 'var(--c-primary)', section: 'ad-budget' },
  { href: '/team',           label: 'Team',              icon: 'groups',                color: 'var(--c-primary)', section: 'team' },
  { href: '/development',    label: 'Development',       icon: 'terminal',              color: 'var(--c-primary)', section: 'development' },
  { href: '/team/workload',  label: 'Team Workload',     icon: 'workspaces',            color: 'var(--c-primary)', section: 'team-workload' },
  { href: '/analytics',      label: 'Analytics',         icon: 'insights',              color: 'var(--c-primary)', section: 'analytics' },
  { href: '/social',         label: 'Social Hub',        icon: 'trending_up',           color: 'var(--c-primary)', section: 'social' },
  { href: '/credentials',    label: 'Credentials',       icon: 'key',                   color: 'var(--c-primary)', section: 'credentials' },
  { href: '/audit',          label: 'Audit Log',         icon: 'history_edu',           color: 'var(--c-primary)', section: 'audit' },
  { href: '/ai',             label: 'Invictus Cortex',   icon: 'auto_awesome',          color: 'var(--c-primary)', section: 'ai' },
  { href: '/finance',        label: 'Finance',           icon: 'account_balance',       color: 'var(--c-primary)', section: 'finance' },
  { href: '/admin',          label: 'Admin',             icon: 'admin_panel_settings',  color: 'var(--c-primary)', section: 'admin' },
];

export interface OpexExpense {
  id: string;
  category: string;
  amountINR: number;
  percentageOfRev: number;
  vsLastMonthStr: string;
  isReimbursable?: boolean;
}

export interface SaaSMetrics {
  currentMRR: number;
  targetMRR: number;
  clientsByPlan: {
    plan: string;
    price: number;
    count: number;
  }[];
  monthlyHistory: { month: string; mrr: number }[];
}

export interface ProjectionMonth {
  month: string;
  revenue: number;
  payroll: number;
  opex: number;
  pnl: number;
  cumulativePnl: number;
  isHistorical: boolean;
}

export interface SystemApproval {
  id: string; 
  status: 'pending'|'approved'|'rejected'; 
  requestedBy: string; 
  approverId: string; 
  kind: 'leave'|'expense'|'other'|'task_review'; 
  contextJson: any; 
  decidedAt?: string;
  refId?: string;
  createdAt?: string;
  decisionNote?: string;
}

export interface FunnelItem {
  id: string;
  stage: string;
  title: string;
  company: string;
  value: number;
  contactName?: string;
  lastActivity?: string;
  isStale?: boolean;
}
export interface ExpenseClaim {
  id: string; title: string; amount: number; status: 'pending'|'approved'|'rejected';
}
export interface JobPosting {
  id: string; title: string;
}
export interface Candidate {
  id: string; name: string;
}
export interface Timesheet {
  id: string;
}
