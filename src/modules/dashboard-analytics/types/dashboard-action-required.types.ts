import type {
  CurrencyCode,
  IsoTimestampString,
  MoneyString,
} from './dashboard-common.types';

export const DASHBOARD_ACTION_REQUIRED_TYPE_VALUES = [
  'payments',
  'deliveries',
  'ai_reviews',
  'change_requests',
] as const;

export type DashboardActionRequiredType =
  (typeof DASHBOARD_ACTION_REQUIRED_TYPE_VALUES)[number];

export interface DashboardActionRequired {
  id: string;
  type: DashboardActionRequiredType;
  title: string;
  description: string;
  agreementId: string;
  agreementTitle?: string | null;
  sourceId: string;
  sourceStatus: string;
  amount?: MoneyString | null;
  currency?: CurrencyCode | null;
  createdAt: IsoTimestampString;
  priority?: 'normal' | 'high' | 'urgent' | null;
}

export interface DashboardActionsRequiredResponse {
  items: DashboardActionRequired[];
}
