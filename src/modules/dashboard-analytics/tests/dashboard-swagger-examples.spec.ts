import {
  DASHBOARD_ACTIONS_REQUIRED_POPULATED_EXAMPLE,
  DASHBOARD_AGGREGATION_ERROR_EXAMPLE,
  DASHBOARD_AGREEMENT_NOT_FOUND_ERROR_EXAMPLE,
  DASHBOARD_OVERVIEW_POPULATED_EXAMPLE,
  DASHBOARD_RANGE_INVALID_ERROR_EXAMPLE,
  DASHBOARD_RECENT_ACTIVITY_POPULATED_EXAMPLE,
  DASHBOARD_UNAUTHORIZED_ERROR_EXAMPLE,
  DASHBOARD_VALIDATION_ERROR_EXAMPLE,
} from '../dto';

describe('dashboard swagger examples', () => {
  it('keeps success examples in the response envelope shape', () => {
    expect(DASHBOARD_OVERVIEW_POPULATED_EXAMPLE).toHaveProperty(
      'success',
      true,
    );
    expect(DASHBOARD_OVERVIEW_POPULATED_EXAMPLE).toHaveProperty('data');
    expect(DASHBOARD_OVERVIEW_POPULATED_EXAMPLE).toHaveProperty(
      'meta.requestId',
    );

    expect(DASHBOARD_ACTIONS_REQUIRED_POPULATED_EXAMPLE).toHaveProperty(
      'meta.requestId',
    );
    expect(DASHBOARD_RECENT_ACTIVITY_POPULATED_EXAMPLE).toHaveProperty(
      'meta.requestId',
    );
  });

  it('keeps money example values as strings', () => {
    expect(
      typeof DASHBOARD_OVERVIEW_POPULATED_EXAMPLE.data.paymentSummary[0]
        .protectedAmount,
    ).toBe('string');
    expect(
      typeof DASHBOARD_ACTIONS_REQUIRED_POPULATED_EXAMPLE.data.items[0].amount,
    ).toBe('string');
  });

  it('keeps error examples in the public error shape', () => {
    expect(DASHBOARD_VALIDATION_ERROR_EXAMPLE).toHaveProperty('success', false);
    expect(DASHBOARD_RANGE_INVALID_ERROR_EXAMPLE).toHaveProperty('error.code');
    expect(DASHBOARD_UNAUTHORIZED_ERROR_EXAMPLE).toHaveProperty(
      'error.requestId',
    );
    expect(DASHBOARD_AGREEMENT_NOT_FOUND_ERROR_EXAMPLE).toHaveProperty(
      'error.code',
      'AGREEMENT_NOT_FOUND',
    );
    expect(DASHBOARD_AGGREGATION_ERROR_EXAMPLE).toHaveProperty(
      'error.code',
      'DASHBOARD_AGGREGATION_FAILED',
    );
  });
});
