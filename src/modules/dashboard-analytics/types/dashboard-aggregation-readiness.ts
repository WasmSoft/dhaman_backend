import {
  DASHBOARD_MAX_LIST_LIMIT,
  DASHBOARD_MIN_LIST_LIMIT,
  DASHBOARD_RANGE_VALUES,
} from './dashboard-common.types';

export const DASHBOARD_AGGREGATION_READINESS = {
  requiresFreelancerScope: true,
  requiresOwnedAgreementCheck: true,
  allowedRanges: DASHBOARD_RANGE_VALUES,
  minLimit: DASHBOARD_MIN_LIST_LIMIT,
  maxLimit: DASHBOARD_MAX_LIST_LIMIT,
  activityOrdering: 'createdAt-desc',
  requiresDemoPaymentsOnly: true,
  allowsCurrencyConversion: false,
} as const;
