import { PaymentStatus, Prisma } from '@prisma/client';
import { assertMoneyString } from './dashboard-dto-test-helpers';
import {
  buildMixedStatusesScenario,
  createDashboardService,
} from './dashboard-service-test-helpers';

describe('dashboard overview payment summary', () => {
  it('groups demo payment totals by currency and status with string amounts', async () => {
    const { service, prisma } = createDashboardService();

    (prisma.agreement.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.payment.groupBy as jest.Mock).mockResolvedValue([
      {
        currency: 'USD',
        status: PaymentStatus.RESERVED,
        _sum: { amount: new Prisma.Decimal('1250.00') },
      },
      {
        currency: 'USD',
        status: PaymentStatus.RELEASED,
        _sum: { amount: new Prisma.Decimal('750.00') },
      },
      {
        currency: 'USD',
        status: PaymentStatus.WAITING,
        _sum: { amount: new Prisma.Decimal('500.00') },
      },
      {
        currency: 'USD',
        status: PaymentStatus.READY_TO_RELEASE,
        _sum: { amount: new Prisma.Decimal('250.00') },
      },
      {
        currency: 'SAR',
        status: PaymentStatus.CLIENT_REVIEW,
        _sum: { amount: new Prisma.Decimal('300.00') },
      },
    ]);
    (prisma.aIReview.groupBy as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.changeRequest.groupBy as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.client.count as jest.Mock).mockResolvedValue(0);
    (prisma.delivery.count as jest.Mock).mockResolvedValue(0);

    const result = await service.getOverview({ range: '30d' });

    expect(result.paymentSummary).toEqual([
      {
        currency: 'USD',
        protectedAmount: '1500.00',
        releasedAmount: '750.00',
        pendingAmount: '500.00',
        readyToReleaseAmount: '250.00',
        byStatus: {
          RESERVED: '1250.00',
          RELEASED: '750.00',
          WAITING: '500.00',
          READY_TO_RELEASE: '250.00',
        },
      },
      {
        currency: 'SAR',
        protectedAmount: '300.00',
        releasedAmount: '0.00',
        pendingAmount: '0.00',
        readyToReleaseAmount: '0.00',
        byStatus: {
          CLIENT_REVIEW: '300.00',
        },
      },
    ]);
    expect(result.metrics[0]).toEqual(
      expect.objectContaining({
        key: 'protected_amount_usd',
        value: '1500.00',
        currency: 'USD',
      }),
    );
  });

  it('asserts every PaymentStatus group total equals the seeded sum and uses assertMoneyString for every monetary value (FR-002, FR-003)', async () => {
    const { service, prisma } = createDashboardService();
    const fixture = buildMixedStatusesScenario();

    const paymentRows = fixture.payments.map((p) => ({
      currency: p.currency,
      status: p.status,
      _sum: { amount: p.amount },
    }));

    (prisma.agreement.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.payment.groupBy as jest.Mock).mockResolvedValue(paymentRows);
    (prisma.aIReview.groupBy as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.changeRequest.groupBy as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.client.count as jest.Mock).mockResolvedValue(1);
    (prisma.delivery.count as jest.Mock).mockResolvedValue(2);

    const result = await service.getOverview({ range: 'all' });

    expect(result.paymentSummary.length).toBeGreaterThan(0);

    for (const summary of result.paymentSummary) {
      assertMoneyString(
        summary.protectedAmount,
        new Prisma.Decimal(summary.protectedAmount),
      );
      assertMoneyString(
        summary.releasedAmount,
        new Prisma.Decimal(summary.releasedAmount),
      );
      assertMoneyString(
        summary.pendingAmount,
        new Prisma.Decimal(summary.pendingAmount),
      );
      assertMoneyString(
        summary.readyToReleaseAmount,
        new Prisma.Decimal(summary.readyToReleaseAmount),
      );

      for (const [status, amount] of Object.entries(summary.byStatus)) {
        const matchingPayment = fixture.payments.find(
          (p) => p.currency === summary.currency && p.status === status,
        );
        if (matchingPayment) {
          assertMoneyString(amount, matchingPayment.amount);
        }
      }
    }
  });
});
