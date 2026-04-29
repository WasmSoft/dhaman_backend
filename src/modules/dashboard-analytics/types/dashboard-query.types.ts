import {
  DASHBOARD_DEFAULT_LIST_LIMIT,
  DASHBOARD_DEFAULT_RANGE,
  DASHBOARD_MAX_LIST_LIMIT,
  DASHBOARD_MIN_LIST_LIMIT,
  type CurrencyCode,
  type DashboardRange,
} from './dashboard-common.types';
import type { TimelineEventType } from './dashboard-status.types';

export const DASHBOARD_ACTION_TYPE_VALUES = [
  'payments',
  'deliveries',
  'ai_reviews',
  'change_requests',
  'all',
] as const;

export type DashboardActionType = (typeof DASHBOARD_ACTION_TYPE_VALUES)[number];

export interface DashboardOverviewQueryContract {
  range?: DashboardRange;
  currency?: CurrencyCode;
}

export interface DashboardActionsQueryContract {
  limit?: number;
  type?: DashboardActionType;
}

export interface DashboardRecentActivityQueryContract {
  limit?: number;
  agreementId?: string;
  type?: TimelineEventType;
}

export const DASHBOARD_QUERY_DEFAULTS = {
  range: DASHBOARD_DEFAULT_RANGE,
  limit: DASHBOARD_DEFAULT_LIST_LIMIT,
  minLimit: DASHBOARD_MIN_LIST_LIMIT,
  maxLimit: DASHBOARD_MAX_LIST_LIMIT,
  actionType: 'all' as DashboardActionType,
} as const;
