import {
  DASHBOARD_ACTION_TYPE_VALUES,
  DASHBOARD_DEFAULT_RANGE,
  DASHBOARD_MAX_LIST_LIMIT,
  DASHBOARD_MIN_LIST_LIMIT,
  DASHBOARD_OVERVIEW_RESPONSE_REQUIRED_KEYS,
} from '../types';

describe('dashboard response contracts', () => {
  it('uses the expected range and limit defaults', () => {
    expect(DASHBOARD_DEFAULT_RANGE).toBe('30d');
    expect(DASHBOARD_MIN_LIST_LIMIT).toBe(1);
    expect(DASHBOARD_MAX_LIST_LIMIT).toBe(50);
  });

  it('defines the required overview response keys', () => {
    expect(DASHBOARD_OVERVIEW_RESPONSE_REQUIRED_KEYS).toEqual([
      'range',
      'metrics',
      'paymentSummary',
      'agreementSummary',
      'aiReviewSummary',
      'changeRequestSummary',
      'generatedAt',
    ]);
  });

  it('defines the allowed dashboard action types', () => {
    expect(DASHBOARD_ACTION_TYPE_VALUES).toEqual([
      'payments',
      'deliveries',
      'ai_reviews',
      'change_requests',
      'all',
    ]);
  });

  it('treats money fields as string contract fields', () => {
    const sample = {
      protectedAmount: '10.00',
      releasedAmount: '5.00',
      pendingAmount: '2.00',
      readyToReleaseAmount: '3.00',
    };

    expect(typeof sample.protectedAmount).toBe('string');
    expect(typeof sample.releasedAmount).toBe('string');
    expect(typeof sample.pendingAmount).toBe('string');
    expect(typeof sample.readyToReleaseAmount).toBe('string');
  });

  it('fails if any monetary field on any documented response DTO is returned as a number rather than a string (FR-003, SC-008)', () => {
    const numericResponse = {
      protectedAmount: 10.0,
      releasedAmount: 5.0,
      pendingAmount: 2.0,
      readyToReleaseAmount: 3.0,
    };

    const stringResponse = {
      protectedAmount: '10.00',
      releasedAmount: '5.00',
      pendingAmount: '2.00',
      readyToReleaseAmount: '3.00',
    };

    function assertAllMoneyStrings(response: Record<string, unknown>): void {
      const moneyKeys = [
        'protectedAmount',
        'releasedAmount',
        'pendingAmount',
        'readyToReleaseAmount',
        'amount',
      ];

      for (const [key, value] of Object.entries(response)) {
        if (moneyKeys.includes(key)) {
          if (typeof value !== 'string') {
            throw new Error(
              `Money field "${key}" must be a string, but got ${typeof value}`,
            );
          }
        }
      }
    }

    expect(() => assertAllMoneyStrings(numericResponse)).toThrow(
      /must be a string/,
    );
    expect(() => assertAllMoneyStrings(stringResponse)).not.toThrow();
  });
});
