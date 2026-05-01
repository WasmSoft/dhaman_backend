import type { CurrencyCode, DashboardRange } from './dashboard-common.types';
import type {
  DashboardAiReviewHighlight,
  DashboardAgreementSummary,
  DashboardAgreementHighlight,
  DashboardChartSummary,
  DashboardCountSummary,
  DashboardGeneratedMeta,
  DashboardMetricCard,
  DashboardMoneyAndCountSummary,
  DashboardPaymentSummary,
  DashboardRecentPayment,
} from './dashboard-summary.types';

export const DASHBOARD_OVERVIEW_RESPONSE_REQUIRED_KEYS = [
  'range',
  'metrics',
  'paymentSummary',
  'agreementSummary',
  'aiReviewSummary',
  'changeRequestSummary',
  'chart',
  'recentAgreements',
  'recentAiReviews',
  'recentPayments',
  'generatedAt',
] as const;

export interface DashboardOverviewResponse extends DashboardGeneratedMeta {
  range: DashboardRange;
  currency?: CurrencyCode | null;
  metrics: DashboardMetricCard[];
  paymentSummary: DashboardPaymentSummary[];
  agreementSummary: DashboardAgreementSummary;
  aiReviewSummary: DashboardCountSummary;
  changeRequestSummary: DashboardMoneyAndCountSummary;
  chart: DashboardChartSummary;
  recentAgreements: DashboardAgreementHighlight[];
  recentAiReviews: DashboardAiReviewHighlight[];
  recentPayments: DashboardRecentPayment[];
}
