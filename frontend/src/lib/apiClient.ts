/**
 * API Client for IGT-OS Backend
 * Centralizes all API calls to the backend service
 * Uses NEXT_PUBLIC_API_URL environment variable
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://IGT-OS-V2-live-Copy.railway.internal:8000';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_URL}${endpoint}`;
    console.log(`[API] ${options?.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`[API Error] ${response.status}:`, responseData);
      return {
        success: false,
        error: responseData.error || `HTTP ${response.status}`,
        message: responseData.message,
      };
    }

    return {
      success: true,
      data: responseData,
    };
  } catch (error) {
    console.error('[API Error]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ──────────────────────────────────────────────────────────────
// AUTH ENDPOINTS
// ──────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string) {
  return apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function signupUser(email: string, password: string, name: string) {
  return apiCall('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}

export async function setPassword(userId: string, newPassword: string) {
  return apiCall('/auth/set-password', {
    method: 'POST',
    body: JSON.stringify({ userId, newPassword }),
  });
}

// ──────────────────────────────────────────────────────────────
// TASKS ENDPOINTS
// ──────────────────────────────────────────────────────────────

export async function getAllTasks() {
  return apiCall('/tasks');
}

export async function getTaskById(taskId: string) {
  return apiCall(`/tasks/${taskId}`);
}

export async function getTasksByClientId(clientId: string) {
  return apiCall(`/tasks/client/${clientId}`);
}

export async function getTasksByUserId(userId: string) {
  return apiCall(`/tasks/user/${userId}`);
}

export async function createTask(taskData: any) {
  return apiCall('/tasks', {
    method: 'POST',
    body: JSON.stringify(taskData),
  });
}

export async function updateTask(taskId: string, updates: any) {
  return apiCall(`/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteTask(taskId: string) {
  return apiCall(`/tasks/${taskId}`, {
    method: 'DELETE',
  });
}

export async function updateTaskStatus(taskId: string, status: string) {
  return apiCall(`/tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function assignTaskToUser(taskId: string, userId: string) {
  return apiCall(`/tasks/${taskId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

// ──────────────────────────────────────────────────────────────
// CLIENTS ENDPOINTS
// ──────────────────────────────────────────────────────────────

export async function getAllClients() {
  return apiCall('/clients');
}

export async function getClientById(clientId: string) {
  return apiCall(`/clients/${clientId}`);
}

export async function createClient(clientData: any) {
  return apiCall('/clients', {
    method: 'POST',
    body: JSON.stringify(clientData),
  });
}

export async function updateClient(clientId: string, updates: any) {
  return apiCall(`/clients/${clientId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteClient(clientId: string) {
  return apiCall(`/clients/${clientId}`, {
    method: 'DELETE',
  });
}

// ──────────────────────────────────────────────────────────────
// TEAM MEMBERS ENDPOINTS
// ──────────────────────────────────────────────────────────────

export async function getAllTeamMembers() {
  return apiCall('/team-members');
}

export async function getTeamMemberById(userId: string) {
  return apiCall(`/team-members/${userId}`);
}

export async function createTeamMember(memberData: any) {
  return apiCall('/team-members', {
    method: 'POST',
    body: JSON.stringify(memberData),
  });
}

export async function updateTeamMember(userId: string, updates: any) {
  return apiCall(`/team-members/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteTeamMember(userId: string) {
  return apiCall(`/team-members/${userId}`, {
    method: 'DELETE',
  });
}

// ──────────────────────────────────────────────────────────────
// TIME ENTRIES ENDPOINTS
// ──────────────────────────────────────────────────────────────

export async function getTimeEntriesByTaskId(taskId: string) {
  return apiCall(`/time-entries/task/${taskId}`);
}

export async function getTimeEntriesByUserId(userId: string) {
  return apiCall(`/time-entries/user/${userId}`);
}

export async function createTimeEntry(entryData: any) {
  return apiCall('/time-entries', {
    method: 'POST',
    body: JSON.stringify(entryData),
  });
}

export async function updateTimeEntry(entryId: string, updates: any) {
  return apiCall(`/time-entries/${entryId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteTimeEntry(entryId: string) {
  return apiCall(`/time-entries/${entryId}`, {
    method: 'DELETE',
  });
}

// ──────────────────────────────────────────────────────────────
// CAMPAIGNS ENDPOINTS
// ──────────────────────────────────────────────────────────────

export async function getAllCampaigns() {
  return apiCall('/campaigns');
}

export async function getCampaignById(campaignId: string) {
  return apiCall(`/campaigns/${campaignId}`);
}

export async function getCampaignsByClientId(clientId: string) {
  return apiCall(`/campaigns/client/${clientId}`);
}

export async function createCampaign(campaignData: any) {
  return apiCall('/campaigns', {
    method: 'POST',
    body: JSON.stringify(campaignData),
  });
}

export async function updateCampaign(campaignId: string, updates: any) {
  return apiCall(`/campaigns/${campaignId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteCampaign(campaignId: string) {
  return apiCall(`/campaigns/${campaignId}`, {
    method: 'DELETE',
  });
}

// ──────────────────────────────────────────────────────────────
// PAYMENTS ENDPOINTS
// ──────────────────────────────────────────────────────────────

export async function getPaymentsByClientId(clientId: string) {
  return apiCall(`/payments/client/${clientId}`);
}

export async function createPayment(paymentData: any) {
  return apiCall('/payments', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  });
}

export async function updatePaymentStatus(paymentId: string, status: string) {
  return apiCall(`/payments/${paymentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ──────────────────────────────────────────────────────────────
// ANALYTICS ENDPOINTS
// ──────────────────────────────────────────────────────────────

export async function getAnalyticsByClientId(clientId: string, month?: string) {
  const url = month 
    ? `/analytics/client/${clientId}?month=${month}`
    : `/analytics/client/${clientId}`;
  return apiCall(url);
}

export async function getTeamAnalytics(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const url = params.toString() 
    ? `/analytics/team?${params.toString()}`
    : '/analytics/team';
  return apiCall(url);
}

export async function getTaskMetrics(taskId: string) {
  return apiCall(`/analytics/task/${taskId}`);
}

// ──────────────────────────────────────────────────────────────
// AUDIT ENDPOINTS
// ──────────────────────────────────────────────────────────────

export async function getAuditLogs(limit?: number, offset?: number) {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  if (offset) params.append('offset', offset.toString());
  
  const url = params.toString()
    ? `/audit?${params.toString()}`
    : '/audit';
  return apiCall(url);
}

export async function getAuditLogsByEntity(entityType: string, entityId: string) {
  return apiCall(`/audit/${entityType}/${entityId}`);
}

// ──────────────────────────────────────────────────────────────
// HEALTH CHECK
// ──────────────────────────────────────────────────────────────

export async function healthCheck() {
  return apiCall('/health');
}

export default {
  // Auth
  loginUser,
  signupUser,
  setPassword,
  // Tasks
  getAllTasks,
  getTaskById,
  getTasksByClientId,
  getTasksByUserId,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  assignTaskToUser,
  // Clients
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  // Team Members
  getAllTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  // Time Entries
  getTimeEntriesByTaskId,
  getTimeEntriesByUserId,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  // Campaigns
  getAllCampaigns,
  getCampaignById,
  getCampaignsByClientId,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  // Payments
  getPaymentsByClientId,
  createPayment,
  updatePaymentStatus,
  // Analytics
  getAnalyticsByClientId,
  getTeamAnalytics,
  getTaskMetrics,
  // Audit
  getAuditLogs,
  getAuditLogsByEntity,
  // Health
  healthCheck,
};

