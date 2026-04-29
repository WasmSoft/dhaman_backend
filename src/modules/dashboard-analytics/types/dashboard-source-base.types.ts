export const DASHBOARD_SOURCE_DOMAIN_NAMES = [
  'agreement',
  'client',
  'milestone',
  'payment',
  'delivery',
  'aiReview',
  'changeRequest',
  'timelineEvent',
] as const;

export type DashboardSourceDomainName =
  (typeof DASHBOARD_SOURCE_DOMAIN_NAMES)[number];

export interface DashboardSourceBase {
  domain: DashboardSourceDomainName;
  purpose: string;
  requiresDashboardPersistence: false;
}
