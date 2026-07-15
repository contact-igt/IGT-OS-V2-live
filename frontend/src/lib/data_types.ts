// ============================================================
// INVICTUS OS — Master Data Store v3
// All mock data. Replace with PostgreSQL queries when ready.
// ============================================================

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
  displayCode?: string;
  sourceType?: 'manual' | 'meeting' | 'lead_stage';
  sourceMeetingTitle?: string;
  sourceTranscriptQuote?: string;
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
}

export interface Client {
  id: string;
  code: string;
  name: string;
  category: string;
  monthlyRetainerINR: number;
  agencyFeeINR: number;
  contractStatus: 'active' | 'paused' | 'churned';
  primaryContact: string;
  notes: string;
  budgetUtilization: number; // 0–100
  color: string;
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
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'ops' | 'team' | 'viewer';
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

  // HRMS extensions
  title?: string;
  dob?: string;
  gender?: string;
  bloodGroup?: string;
  joinDate?: string;
  employmentType?: string;
  probationEnd?: string;
  basic?: number;
  hra?: number;
  specialAllowance?: number;
  reportingManager?: string; // id of manager
  workLocation?: string;
  assets?: string; // or structured array, but string is easier given prompt format
  uan?: string;
  pan?: string;
  performanceRating?: number;
  exitDate?: string;
  exitReason?: string;
  monthlyFixed?: number; // for part time
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  month: string; // '2026-04'
  present: number;
  late: number;
  absent: number;
  halfDay: number;
  totalHours: number;
  avgIn?: string;
  avgOut?: string;
  notes?: string;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  type: string;
  status: 'IN PROGRESS' | 'COMPLETED' | 'TERMINATED' | 'DELIVERED BUT CLIENT EXITED';
  team: string[]; // member IDs
  startDate: string;
  completedDate?: string;
  estimatedHours: number;
  actualHours: number;
  budget?: string;
  notes?: string;
}

export interface PerformanceBenchmark {
  taskType: string;
  targetHours: number;
  agencyAvgActual: number;
  unit: string;
}

export interface LeaveBalance {
  employeeId: string;
  elRemaining: number | string;
  clRemaining: number | string;
  slUsed: number;
  notes?: string;
}

export interface AttendanceLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  clockIn: string | null; // ISO timestamp
  clockOut: string | null; // ISO timestamp
  totalMinutes: number;
  status: 'present' | 'late' | 'half_day' | 'absent' | 'leave' | 'holiday' | 'weekend';
  lateFlag: boolean;
  source: 'web' | 'desktop_app' | 'manual_correction' | 'system';
  autoClosed: boolean;
  correctionNote?: string;
}

export interface LeaveType {
  code: string;
  name: string;
  annualAllocation: number;
  accrues: boolean;
  carryForwardMax: number;
}

export interface LeaveLedgerEntry {
  id: string;
  userId: string;
  leaveType: string;
  delta: number;
  reason: 'accrual' | 'approved_leave' | 'cancellation' | 'encashment' | 'adjustment' | 'seed';
  refRequestId?: string;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  leaveType: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  halfDay: boolean;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  decidedBy?: string;
  decidedAt?: string;
  decisionNote?: string;
  createdAt: string;
}

export interface Approval {
  id: string;
  kind: 'leave' | 'attendance_correction' | 'comp_off' | 'wfh' | 'asset_request' | 'export' | 'task_review' | 'probation_review';
  refId: string;
  requestedBy: string;
  approverId: string;
  status: 'pending' | 'approved' | 'rejected';
  contextJson: any; // Denormalized display data
  createdAt: string;
  decidedAt?: string;
  decisionNote?: string;
}

export interface CampaignWeeklyLog {
  id: string;
  campaignId: string; // ID of the task or project acting as campaign
  loggedBy: string;
  weekStart: string; // YYYY-MM-DD
  impressions: number;
  clicks: number;
  leads: number;
  spendInr: number;
  cplInr: number; // spendInr / leads
  note?: string;
  createdAt: string;
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

// ─────────────────────────────────────────────────────────────
// HRMS ADDENDUM (Timesheets, Expenses, Candidates)
// ─────────────────────────────────────────────────────────────
export interface Timesheet {
  id: string;
  userId: string;
  periodStartDate: string; // ISO Date string (e.g. Monday)
  periodEndDate: string; // ISO Date string (e.g. Sunday)
  totalHours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedAt?: string;
  approvedBy?: string;
}

export interface ExpenseClaim {
  id: string;
  userId: string;
  date: string;
  category: 'travel' | 'software' | 'equipment' | 'other';
  amountINR: number;
  description: string;
  receiptUrl?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  reimbursedAt?: string;
  approvedBy?: string;
}

export interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  status: 'draft' | 'open' | 'closed';
  openings: number;
  createdAt: string;
}

export interface Candidate {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  stage: 'applied' | 'screening' | 'interview1' | 'interview2' | 'offered' | 'hired' | 'rejected';
  appliedAt: string;
  rating?: number; // 1-5
  notes?: string;
}

export interface JobOffer {
  id: string;
  candidateId: string;
  jobId: string;
  ctcOffered: number;
  status: 'pending' | 'accepted' | 'declined';
  joiningDate?: string;
}
