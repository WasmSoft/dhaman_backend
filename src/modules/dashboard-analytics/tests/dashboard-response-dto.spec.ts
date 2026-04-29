import {
  DASHBOARD_ACTIONS_REQUIRED_EMPTY_EXAMPLE,
  DASHBOARD_ACTIONS_REQUIRED_POPULATED_EXAMPLE,
  DASHBOARD_OVERVIEW_EMPTY_EXAMPLE,
  DASHBOARD_OVERVIEW_POPULATED_EXAMPLE,
  DASHBOARD_RECENT_ACTIVITY_EMPTY_EXAMPLE,
  DASHBOARD_RECENT_ACTIVITY_POPULATED_EXAMPLE,
  DashboardActionsRequiredEnvelopeDto,
  DashboardActionsRequiredResponseDto,
  DashboardActionRequiredDto,
  DashboardApiMetaDto,
  DashboardCountSummaryDto,
  DashboardMetricCardDto,
  DashboardMoneyAndCountSummaryDto,
  DashboardOverviewEnvelopeDto,
  DashboardOverviewResponseDto,
  DashboardPaymentSummaryDto,
  DashboardRecentActivityDto,
  DashboardRecentActivityEnvelopeDto,
  DashboardRecentActivityResponseDto,
  DashboardAgreementSummaryDto,
} from '../dto';

describe('dashboard response DTOs', () => {
  it('exports all expected response DTO classes', () => {
    expect(DashboardMetricCardDto).toBeDefined();
    expect(DashboardPaymentSummaryDto).toBeDefined();
    expect(DashboardAgreementSummaryDto).toBeDefined();
    expect(DashboardCountSummaryDto).toBeDefined();
    expect(DashboardMoneyAndCountSummaryDto).toBeDefined();
    expect(DashboardOverviewResponseDto).toBeDefined();
    expect(DashboardActionRequiredDto).toBeDefined();
    expect(DashboardActionsRequiredResponseDto).toBeDefined();
    expect(DashboardRecentActivityDto).toBeDefined();
    expect(DashboardRecentActivityResponseDto).toBeDefined();
    expect(DashboardApiMetaDto).toBeDefined();
    expect(DashboardOverviewEnvelopeDto).toBeDefined();
    expect(DashboardActionsRequiredEnvelopeDto).toBeDefined();
    expect(DashboardRecentActivityEnvelopeDto).toBeDefined();
  });

  it('keeps overview money example values as strings', () => {
    const paymentSummary =
      DASHBOARD_OVERVIEW_POPULATED_EXAMPLE.data.paymentSummary[0];

    expect(typeof paymentSummary.protectedAmount).toBe('string');
    expect(typeof paymentSummary.releasedAmount).toBe('string');
    expect(typeof paymentSummary.pendingAmount).toBe('string');
    expect(typeof paymentSummary.readyToReleaseAmount).toBe('string');
  });

  it('keeps action amount example values as strings', () => {
    const action = DASHBOARD_ACTIONS_REQUIRED_POPULATED_EXAMPLE.data.items[0];

    expect(typeof action.amount).toBe('string');
  });

  it('keeps empty examples as empty lists', () => {
    expect(DASHBOARD_OVERVIEW_EMPTY_EXAMPLE.data.metrics).toEqual([]);
    expect(DASHBOARD_ACTIONS_REQUIRED_EMPTY_EXAMPLE.data.items).toEqual([]);
    expect(DASHBOARD_RECENT_ACTIVITY_EMPTY_EXAMPLE.data.items).toEqual([]);
  });

  it('keeps envelope examples with success and requestId metadata', () => {
    expect(DASHBOARD_OVERVIEW_POPULATED_EXAMPLE.success).toBe(true);
    expect(DASHBOARD_OVERVIEW_POPULATED_EXAMPLE.meta.requestId).toBeDefined();
    expect(DASHBOARD_ACTIONS_REQUIRED_POPULATED_EXAMPLE.success).toBe(true);
    expect(
      DASHBOARD_RECENT_ACTIVITY_POPULATED_EXAMPLE.meta.requestId,
    ).toBeDefined();
  });
});
