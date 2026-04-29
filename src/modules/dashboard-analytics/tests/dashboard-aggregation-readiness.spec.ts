import {
  DASHBOARD_AGGREGATION_READINESS,
  DASHBOARD_REQUIRED_CONTEXT_FIELDS,
  DASHBOARD_RANGE_VALUES,
} from '../types';

describe('dashboard aggregation readiness', () => {
  it('requires authenticated freelancer scope and owned agreement checks', () => {
    expect(DASHBOARD_AGGREGATION_READINESS.requiresFreelancerScope).toBe(true);
    expect(DASHBOARD_AGGREGATION_READINESS.requiresOwnedAgreementCheck).toBe(
      true,
    );
  });

  it('uses the allowed range values and max limit', () => {
    expect(DASHBOARD_RANGE_VALUES).toEqual(['7d', '30d', '90d', 'all']);
    expect(DASHBOARD_AGGREGATION_READINESS.maxLimit).toBe(50);
  });

  it('uses newest-first activity ordering and demo payment filtering', () => {
    expect(DASHBOARD_AGGREGATION_READINESS.activityOrdering).toBe(
      'createdAt-desc',
    );
    expect(DASHBOARD_AGGREGATION_READINESS.requiresDemoPaymentsOnly).toBe(true);
    expect(DASHBOARD_AGGREGATION_READINESS.allowsCurrencyConversion).toBe(
      false,
    );
  });

  it('defines the required request context fields', () => {
    expect(DASHBOARD_REQUIRED_CONTEXT_FIELDS).toEqual([
      'requestId',
      'correlationId',
      'locale',
      'actorType',
      'userId',
      'userRole',
    ]);
  });
});
