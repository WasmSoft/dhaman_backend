import {
  DASHBOARD_INDEX_READINESS,
  DASHBOARD_SOURCE_DOMAINS,
  DASHBOARD_SOURCE_FIELD_MAP,
} from '../types';

describe('dashboard source field map', () => {
  it('covers the eight dashboard source domains', () => {
    expect(DASHBOARD_SOURCE_DOMAINS).toHaveLength(8);
    expect(DASHBOARD_SOURCE_DOMAINS.map((entry) => entry.domain)).toEqual([
      'agreement',
      'client',
      'milestone',
      'payment',
      'delivery',
      'aiReview',
      'changeRequest',
      'timelineEvent',
    ]);
  });

  it('does not require dashboard persistence for any source domain', () => {
    expect(
      DASHBOARD_SOURCE_DOMAINS.every(
        (entry) => entry.requiresDashboardPersistence === false,
      ),
    ).toBe(true);
  });

  it('includes required fields for key dashboard domains', () => {
    expect(DASHBOARD_SOURCE_FIELD_MAP.agreement).toEqual(
      expect.arrayContaining(['freelancerId', 'totalAmount', 'status']),
    );
    expect(DASHBOARD_SOURCE_FIELD_MAP.payment).toEqual(
      expect.arrayContaining(['amount', 'currency', 'demoMode', 'status']),
    );
    expect(DASHBOARD_SOURCE_FIELD_MAP.timelineEvent).toEqual(
      expect.arrayContaining(['type', 'title', 'actorRole', 'createdAt']),
    );
  });

  it('tracks an index readiness note for every source domain', () => {
    expect(Object.keys(DASHBOARD_INDEX_READINESS)).toHaveLength(8);
    expect(DASHBOARD_INDEX_READINESS.delivery).toContain('status index');
  });
});
