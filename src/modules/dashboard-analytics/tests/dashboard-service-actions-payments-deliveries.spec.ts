import { DeliveryStatus, PaymentStatus, Prisma } from '@prisma/client';
import {
  buildMixedStatusesScenario,
  createDashboardService,
} from './dashboard-service-test-helpers';

describe('dashboard actions for payments and deliveries', () => {
  it('returns owned ready-to-release payment actions and changes-requested delivery actions', async () => {
    const { service, prisma } = createDashboardService();

    (prisma.payment.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'payment-1',
        status: PaymentStatus.READY_TO_RELEASE,
        amount: new Prisma.Decimal('250.00'),
        currency: 'USD',
        createdAt: new Date('2026-04-29T11:00:00.000Z'),
        agreement: { id: 'agreement-1', title: 'Landing page redesign' },
      },
    ]);
    (prisma.delivery.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'delivery-1',
        status: DeliveryStatus.CHANGES_REQUESTED,
        createdAt: new Date('2026-04-29T10:00:00.000Z'),
        agreement: { id: 'agreement-2', title: 'Mobile app QA' },
      },
    ]);
    (prisma.aIReview.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.changeRequest.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.getActionsRequired({ type: 'all', limit: 10 });

    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'payment:payment-1',
        type: 'payments',
        sourceStatus: 'READY_TO_RELEASE',
        amount: '250.00',
      }),
      expect.objectContaining({
        id: 'delivery:delivery-1',
        type: 'deliveries',
        sourceStatus: 'CHANGES_REQUESTED',
      }),
    ]);
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          demoMode: true,
          agreement: { freelancerId: 'freelancer-1' },
        }),
      }),
    );
  });

  it('classifies deliveries-needing-changes and payments-awaiting-release against the mixed-statuses fixture (FR-004)', async () => {
    const { service, prisma } = createDashboardService();
    const fixture = buildMixedStatusesScenario();

    const readyPayments = fixture.payments.filter(
      (p) => p.status === PaymentStatus.READY_TO_RELEASE,
    );
    const changedDeliveries = fixture.deliveries.filter(
      (d) => d.status === DeliveryStatus.CHANGES_REQUESTED,
    );

    (prisma.payment.findMany as jest.Mock).mockResolvedValue(
      readyPayments.map((p) => ({
        id: p.id,
        status: p.status,
        amount: p.amount,
        currency: p.currency,
        createdAt: p.createdAt,
        agreement: { id: p.agreementId, title: 'Test Agreement' },
      })),
    );
    (prisma.delivery.findMany as jest.Mock).mockResolvedValue(
      changedDeliveries.map((d) => ({
        id: d.id,
        status: d.status,
        createdAt: d.createdAt,
        agreement: { id: d.agreementId, title: 'Test Agreement' },
      })),
    );
    (prisma.aIReview.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.changeRequest.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.getActionsRequired({ type: 'all', limit: 50 });

    const paymentItems = result.items.filter((i) => i.type === 'payments');
    const deliveryItems = result.items.filter((i) => i.type === 'deliveries');

    expect(paymentItems.length).toBe(readyPayments.length);
    expect(deliveryItems.length).toBe(changedDeliveries.length);

    for (const item of paymentItems) {
      expect(item.sourceStatus).toBe(PaymentStatus.READY_TO_RELEASE);
    }
    for (const item of deliveryItems) {
      expect(item.sourceStatus).toBe(DeliveryStatus.CHANGES_REQUESTED);
    }
  });
});
