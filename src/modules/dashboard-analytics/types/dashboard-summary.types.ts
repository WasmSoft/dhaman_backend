import type {
  CurrencyCode,
  IsoTimestampString,
  MoneyString,
} from './dashboard-common.types';

export const DASHBOARD_METRIC_VALUE_TYPE_VALUES = [
  'count',
  'money',
  'percentage',
] as const;

export type DashboardMetricValueType =
  (typeof DASHBOARD_METRIC_VALUE_TYPE_VALUES)[number];

export interface DashboardMetricCard {
  key: string;
  label: string;
  value: MoneyString | number;
  valueType: DashboardMetricValueType;
  currency?: CurrencyCode | null;
  status?: string | null;
  trend?: string | null;
}

export interface DashboardPaymentSummary {
  currency: CurrencyCode;
  protectedAmount: MoneyString;
  releasedAmount: MoneyString;
  pendingAmount: MoneyString;
  readyToReleaseAmount: MoneyString;
  byStatus: Record<string, MoneyString>;
}

export interface DashboardAgreementSummary {
  total: number;
  active: number;
  completed: number;
  disputed: number;
  draftOrSent: number;
  byStatus: Record<string, number>;
}

export interface DashboardCountSummary {
  total: number;
  byStatus: Record<string, number>;
  byRecommendation?: Record<string, number>;
}

export interface DashboardMoneyAndCountSummary {
  total: number;
  byStatus: Record<string, number>;
  amountsByCurrency?: Record<CurrencyCode, MoneyString>;
}

export interface DashboardChartPoint {
  bucketStart: IsoTimestampString;
  bucketEnd: IsoTimestampString;
  count: number;
}

export interface DashboardChartSummary {
  metric: 'protected_payments_count';
  points: DashboardChartPoint[];
}

export interface DashboardAgreementHighlight {
  id: string;
  title: string;
  totalAmount: MoneyString;
  currency: CurrencyCode;
  status: string;
  updatedAt: IsoTimestampString;
}

export interface DashboardAiReviewHighlight {
  id: string;
  agreementId: string;
  agreementTitle?: string | null;
  status: string;
  recommendation: string;
  matchScore?: number | null;
  createdAt: IsoTimestampString;
}

export interface DashboardRecentPayment {
  id: string;
  agreementId: string;
  agreementTitle?: string | null;
  amount: MoneyString;
  currency: CurrencyCode;
  status: string;
  createdAt: IsoTimestampString;
}

export interface DashboardGeneratedMeta {
  generatedAt: IsoTimestampString;
}
