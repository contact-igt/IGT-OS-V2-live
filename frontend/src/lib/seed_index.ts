/* eslint-disable @typescript-eslint/no-explicit-any */

// SEED INDEX — src/lib/seed_index.ts
// Aggregates all seed data for AppContext.

import { TASKS_JAN_MAY } from './seed_tasks_a';
import { TASKS_JUN_SEP } from './seed_tasks_b';
import { TIME_ENTRIES_A } from './seed_entries_a';
import { TIME_ENTRIES_B } from './seed_entries_b';
import {
  MEETING_NOTES_SEED, INITIAL_AUDIT_LOG_FULL,
  ATTENDANCE_TODAY, AD_ACCOUNT_BALANCES,
  GITHUB_DEV_ACTIVITY, GITHUB_REPOS,
  MOCK_LEADS, CAMPAIGN_LOGS, MEETINGS_TODAY,
} from './seed_meetings';
import { CAMPAIGN_LOGS_FULL, CLIENT_METRICS_FULL, LEAVE_REQUESTS_FULL } from './seed_metrics';
import { MOCK_PAYMENTS } from './seed_payments';

export * from './seed_finance';

export const INITIAL_TASKS_FULL = [...TASKS_JAN_MAY, ...TASKS_JUN_SEP];
export const SEED_TIME_ENTRIES_FULL = [...TIME_ENTRIES_A, ...TIME_ENTRIES_B];
export {
  MEETING_NOTES_SEED, INITIAL_AUDIT_LOG_FULL,
  CAMPAIGN_LOGS_FULL, CLIENT_METRICS_FULL, LEAVE_REQUESTS_FULL,
  ATTENDANCE_TODAY, AD_ACCOUNT_BALANCES,
  GITHUB_DEV_ACTIVITY, GITHUB_REPOS,
  MOCK_LEADS, CAMPAIGN_LOGS, MEETINGS_TODAY,
  MOCK_PAYMENTS
};
