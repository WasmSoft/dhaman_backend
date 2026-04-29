import type { DashboardSourceBase } from './dashboard-source-base.types';

export const DASHBOARD_SOURCE_DOMAINS: ReadonlyArray<DashboardSourceBase> = [
  {
    domain: 'agreement',
    purpose: 'Agreement counts, cards, and scoped parent relation data.',
    requiresDashboardPersistence: false,
  },
  {
    domain: 'client',
    purpose: 'Client counts and display context.',
    requiresDashboardPersistence: false,
  },
  {
    domain: 'milestone',
    purpose: 'Progress, due work, and status context.',
    requiresDashboardPersistence: false,
  },
  {
    domain: 'payment',
    purpose: 'Protected, pending, ready, and released fund summaries.',
    requiresDashboardPersistence: false,
  },
  {
    domain: 'delivery',
    purpose: 'Delivery review and changes-requested work.',
    requiresDashboardPersistence: false,
  },
  {
    domain: 'aiReview',
    purpose: 'AI review status and recommendation context.',
    requiresDashboardPersistence: false,
  },
  {
    domain: 'changeRequest',
    purpose: 'Extra work and change request summaries.',
    requiresDashboardPersistence: false,
  },
  {
    domain: 'timelineEvent',
    purpose: 'Recent activity feed entries.',
    requiresDashboardPersistence: false,
  },
] as const;
