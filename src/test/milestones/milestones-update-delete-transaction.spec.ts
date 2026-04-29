import { AgreementStatus, Prisma } from '@prisma/client';
import { PaymentsService } from '../../modules/payments/payments.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MilestonesService } from '../../modules/milestones/milestones.service';
import { TimelineEventsService } from '../../modules/timeline-events/timeline-events.service';

function createOwnedMilestone() {
  return {
    acceptanceCriteria: [{ description: 'Initial criterion', required: true }],
    agreement: {
      currency: 'SAR',
      freelancerId: 'user-1',
      id: 'agreement-1',
      status: AgreementStatus.DRAFT,
      totalAmount: new Prisma.Decimal('7500.00'),
    },
    agreementId: 'agreement-1',
    amount: new Prisma.Decimal('2500.00'),
    createdAt: new Date('2026-04-29T00:00:00.000Z'),
    currency: 'SAR',
    deliveryStatus: 'NOT_SUBMITTED',
    description: 'Initial description',
    dueDate: null,
    id: 'milestone-1',
    order: 1,
    paymentStatus: 'WAITING',
    revisionLimit: 3,
    status: 'DRAFT',
    title: 'Initial title',
    updatedAt: new Date('2026-04-29T00:00:00.000Z'),
  };
}

describe('MilestonesService update/delete transactions', () => {
  it('calls the payment sync helper inside the update transaction callback', async () => {
    const tx = {
      agreement: { findFirst: jest.fn() },
      milestone: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: new Prisma.Decimal('2750.00') },
        }),
        create: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(createOwnedMilestone()),
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({
          ...createOwnedMilestone(),
          amount: new Prisma.Decimal('2750.00'),
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
      agreement: tx.agreement,
      milestone: tx.milestone,
    };
    const paymentsService = {
      createPaymentForMilestone: jest.fn(),
      deleteWaitingPaymentForMilestone: jest.fn(),
      syncMilestonePaymentAmount: jest.fn().mockResolvedValue(undefined),
    };
    const timelineEventsService = {
      createEvent: jest.fn().mockResolvedValue(undefined),
    };
    const service = new MilestonesService(
      prisma as unknown as PrismaService,
      paymentsService as unknown as PaymentsService,
      timelineEventsService as unknown as TimelineEventsService,
    );

    await service.updateMilestone(
      'milestone-1',
      { amount: '2750.00' },
      'user-1',
    );

    expect(paymentsService.syncMilestonePaymentAmount).toHaveBeenCalledWith(
      tx,
      {
        amount: expect.any(Prisma.Decimal) as unknown,
        milestoneId: 'milestone-1',
      },
    );
    expect(timelineEventsService.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'MILESTONE_UPDATED' }),
      tx,
    );
  });

  it('calls the payment delete helper inside the delete transaction callback', async () => {
    const tx = {
      agreement: { findFirst: jest.fn() },
      milestone: {
        aggregate: jest.fn(),
        create: jest.fn(),
        delete: jest.fn().mockResolvedValue({ id: 'milestone-1' }),
        findFirst: jest.fn().mockResolvedValue(createOwnedMilestone()),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
      agreement: tx.agreement,
      milestone: tx.milestone,
    };
    const paymentsService = {
      createPaymentForMilestone: jest.fn(),
      deleteWaitingPaymentForMilestone: jest.fn().mockResolvedValue(undefined),
      syncMilestonePaymentAmount: jest.fn(),
    };
    const timelineEventsService = {
      createEvent: jest.fn().mockResolvedValue(undefined),
    };
    const service = new MilestonesService(
      prisma as unknown as PrismaService,
      paymentsService as unknown as PaymentsService,
      timelineEventsService as unknown as TimelineEventsService,
    );

    await service.deleteMilestone('milestone-1', 'user-1');

    expect(
      paymentsService.deleteWaitingPaymentForMilestone,
    ).toHaveBeenCalledWith(tx, {
      milestoneId: 'milestone-1',
    });
    expect(timelineEventsService.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'MILESTONE_DELETED' }),
      tx,
    );
  });
});
