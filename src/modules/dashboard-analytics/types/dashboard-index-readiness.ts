import type { DashboardSourceDomainName } from './dashboard-source-base.types';

export const DASHBOARD_INDEX_READINESS: Record<
  DashboardSourceDomainName,
  string
> = {
  agreement:
    'Existing freelancerId, clientId, and status indexes support ownership and status filtering.',
  client:
    'Existing freelancerId index and freelancerId/email uniqueness support scoped client reads.',
  milestone:
    'Existing agreementId and status indexes plus agreementId/order uniqueness support progress reads.',
  payment:
    'Existing agreementId, milestoneId, changeRequestId, and status indexes support summary filters.',
  delivery:
    'Existing agreementId, milestoneId, and submittedById indexes exist; status index is not present and must be measured later.',
  aiReview:
    'Existing agreementId, milestoneId, and status indexes support review summaries.',
  changeRequest:
    'Existing agreementId, milestoneId, and status indexes support scoped filters.',
  timelineEvent:
    'Existing agreementId, milestoneId, actorId, and type indexes support filters; createdAt ordering may need later measurement.',
} as const;
