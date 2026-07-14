// ============================================================
// INVICTUS OS — Meeting Intelligence Types
// Used by /ai Meeting Notes tab and the Claude API route
// ============================================================

export interface TalkParticipant {
  name: string;
  estimatedPercent: number;
  dominanceRating: 'dominant' | 'balanced' | 'quiet';
  sentimentTone: 'positive' | 'neutral' | 'cautious' | 'frustrated' | 'confused';
  speakingPattern: string;
  side?: 'invictus' | 'client' | 'external';
}

export interface TalkTime {
  participants: TalkParticipant[];
  clientTalkPercent: number;
  invictusTalkPercent: number;
  conversationBalance: 'balanced' | 'invictus_heavy' | 'client_heavy';
  balanceNote: string;
}

export interface MeetingQuality {
  score: number;
  rating: 'excellent' | 'good' | 'average' | 'poor' | 'alarming';
  flags: string[];
  positives: string[];
  issues: string[];
  narrative: string;
}

export interface MeetingMeta {
  title: string;
  date: string | null;
  durationMinutes: number | null;
  meetingType: 'discovery' | 'proposal' | 'proposal_revision' | 'deal_closed' | 'onboarding' | 'monthly_review' | 'strategy_review' | 'internal_team' | 'product';
  clientName: string | null;
  clientContact: string | null;
  invictusLead: string | null;
  participants: { name: string; side: 'invictus' | 'client' | 'external' }[];
}

export interface Decision {
  decision: string;
  decidedBy: string | null;
  isBinding: boolean;
  sourceQuote: string;
}

export interface MomClient {
  subject: string;
  greeting: string;
  openingPara: string;
  keyDecisions: string[];
  nextStepsInvictus: string[];
  nextStepsClient: string[];
  nextMeetingNote: string | null;
  closingPara: string;
  signoff: string;
}

export interface MomTeam {
  heading: string;
  clientSnapshot: string;
  dealStatus: string;
  whatWeCommitted: string[];
  whatClientCommitted: string[];
  watchOuts: string[];
  teamActions: { who: string; what: string; by: string }[];
  internalNotes: string;
}

export interface LeadCycleUpdate {
  currentStage: 'discovery' | 'proposal' | 'proposal_revision' | 'deal_closed' | 'onboarding' | 'monthly_review' | 'churned' | 'paused';
  stageChange: boolean;
  commercialUpdate: {
    proposedValue: string | null;
    agreedValue: string | null;
    negotiationNote: string | null;
  };
}

export interface ProposedTaskRaw {
  title: string;
  description: string;
  owner: string | null;
  ownerSide: 'invictus' | 'client';
  deadline: string | null;
  deadlineVerbatim: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  sourceQuote: string;
}

export interface ProposedTask extends ProposedTaskRaw {
  // UI state added client-side after analysis
  status: 'pending' | 'approved' | 'rejected';
  assigneeId: string | null;   // resolved team member ID
  category: string;            // user-selected category
  clientName: string | null;   // from meetingMeta
}

export interface MeetingAnalysisResult {
  summary?: string;
  keyPoints?: string[];
  keywords?: string[];
  projectInsights?: string;
  salesInsights?: string;
  aiInsights?: string;
  roleInsights?: any;
  userAnalyses?: Record<string, any>;
  
  meetingMeta: MeetingMeta;
  talkTime: TalkTime;
  meetingQuality: MeetingQuality;
  decisions: Decision[];
  actionItems: ProposedTaskRaw[];
  momClient: MomClient;
  momTeam: MomTeam;
  openQuestions: string[];
  leadCycleUpdate: LeadCycleUpdate;
}

// Persisted in AppContext after tasks are created
export interface MeetingNote {
  id: string;
  clientId: string | null;
  processedAt: string;
  googleEventId?: string;
  transcriptSnippet: string;
  result: MeetingAnalysisResult;
  tasksCreated: string[];
  momSentAt?: string;
}
