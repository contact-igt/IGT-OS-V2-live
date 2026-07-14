import re

with open("src/contexts/AppContext.tsx", "r") as f:
    content = f.read()

# Add isGlobalLoading and globalError to AppState
content = content.replace("screenShareMode: boolean;", "screenShareMode: boolean;\n  isGlobalLoading: boolean;\n  globalError: string | null;")

# Update initialState
new_initial_state = """const initialState: AppState = {
  tasks: [],
  clients: [],
  teamMembers: [],
  credentials: [],
  socialMetrics: [],
  activeTimers: [],
  auditLog: [],
  currentUserId: 'u1',
  tickCount: 0,
  notifications: [],
  timeEntries: [],
  meetingNotes: [],
  leads: [],
  leaveRequests: [],
  campaignWeeklyLogs: [],
  attendanceLogs: [],
  adAccountBalances: [],
  githubActivity: [],
  githubRepos: [],
  payments: [],
  meetings: [],
  campaigns: [],
  campaignLogs2: [],
  opexExpenses: [],
  saasMetrics: { mrr: 0, arr: 0, activeClients: 0, retentionRate: 0, avgRetainer: 0 },
  projections: [],
  stateVersion: 9,
  githubCommits: [],
  adRecharges: [],
  devProjects: [],
  screenShareMode: false,
  isGlobalLoading: true,
  globalError: null,
};"""
content = re.sub(r'const initialState: AppState = \{.*?\};', new_initial_state, content, flags=re.DOTALL)

# Add SET_LOADING and SET_ERROR to AppAction
content = content.replace("| { type: 'SET_SCREEN_SHARE_MODE'; payload: boolean };", "| { type: 'SET_SCREEN_SHARE_MODE'; payload: boolean }\n  | { type: 'SET_LOADING'; payload: boolean }\n  | { type: 'SET_ERROR'; payload: string | null };")

# Add to reducer
reducer_additions = """    case 'SET_LOADING':
      return { ...state, isGlobalLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, globalError: action.payload, isGlobalLoading: false };
"""
content = content.replace("case 'SET_SCREEN_SHARE_MODE':", reducer_additions + "    case 'SET_SCREEN_SHARE_MODE':")

# Write it back
with open("src/contexts/AppContext.tsx", "w") as f:
    f.write(content)
