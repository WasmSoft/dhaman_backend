import { AgreementStatus, Prisma } from '@prisma/client';
import { PaymentsService } from '../../modules/payments/payments.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MilestonesService } from '../../modules/milestones/milestones.service';
import { TimelineEventsService } from '../../modules/timeline-events/timeline-events.service';

describe('MilestonesService createMilestone transactions', () => {
  it('calls the payment helper inside the same transaction callback', async () => {
    const tx = {
      agreement: {
        findFirst: jest.fn().mockResolvedValue({
          currency: 'SAR',
          freelancerId: 'user-1',
          id: 'agreement-1',
          status: AgreementStatus.DRAFT,
          totalAmount: new Prisma.Decimal('7500.00'),
        }),
      },
      milestone: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: new Prisma.Decimal('2500.00') },
        }),
        create: jest.fn().mockResolvedValue({
          acceptanceCriteria: [
            { description: 'Logo delivered in SVG format', required: true },
          ],
          agreementId: 'agreement-1',
          amount: new Prisma.Decimal('2500.00'),
          createdAt: new Date('2026-04-29T00:00:00.000Z'),
          currency: 'SAR',
          deliveryStatus: 'NOT_SUBMITTED',
          description: null,
          dueDate: null,
          id: 'milestone-1',
          order: 1,
          paymentStatus: 'WAITING',
          revisionLimit: 3,
          status: 'DRAFT',
          title: 'Brand identity delivery',
          updatedAt: new Date('2026-04-29T00:00:00.000Z'),
        }),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
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
      createPaymentForMilestone: jest.fn().mockResolvedValue(undefined),
      deleteWaitingPaymentForMilestone: jest.fn(),
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

    await service.createMilestone(
      'agreement-1',
      {
        acceptanceCriteria: [{ description: 'Logo delivered in SVG format' }],
        amount: '2500.00',
        orderIndex: 1,
        title: 'Brand identity delivery',
      },
      'user-1',
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(paymentsService.createPaymentForMilestone).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ milestoneId: 'milestone-1' }),
    );
    expect(timelineEventsService.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'MILESTONE_CREATED' }),
      tx,
    );
  });

  it('rejects when the payment helper fails and does not return a success payload', async () => {
    const tx = {
      agreement: {
        findFirst: jest.fn().mockResolvedValue({
          currency: 'SAR',
          freelancerId: 'user-1',
          id: 'agreement-1',
          status: AgreementStatus.DRAFT,
          totalAmount: new Prisma.Decimal('7500.00'),
        }),
      },
      milestone: {
        aggregate: jest.fn(),
        create: jest.fn().mockResolvedValue({
          acceptanceCriteria: [
            { description: 'Logo delivered in SVG format', required: true },
          ],
          agreementId: 'agreement-1',
          amount: new Prisma.Decimal('2500.00'),
          createdAt: new Date('2026-04-29T00:00:00.000Z'),
          currency: 'SAR',
          deliveryStatus: 'NOT_SUBMITTED',
          description: null,
          dueDate: null,
          id: 'milestone-1',
          order: 1,
          paymentStatus: 'WAITING',
          revisionLimit: 3,
          status: 'DRAFT',
          title: 'Brand identity delivery',
          updatedAt: new Date('2026-04-29T00:00:00.000Z'),
        }),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
      },
    };
    const paymentsService = {
      createPaymentForMilestone: jest
        .fn()
        .mockRejectedValue(new Error('payment helper failed')),
      deleteWaitingPaymentForMilestone: jest.fn(),
      syncMilestonePaymentAmount: jest.fn(),
    };
    const timelineEventsService = {
      createEvent: jest.fn().mockResolvedValue(undefined),
    };
    const service = new MilestonesService(
      {
        $transaction: jest.fn(
          async (callback: (client: typeof tx) => Promise<unknown>) =>
            callback(tx),
        ),
        agreement: tx.agreement,
        milestone: tx.milestone,
      } as unknown as PrismaService,
      paymentsService as unknown as PaymentsService,
      timelineEventsService as unknown as TimelineEventsService,
    );

    await expect(
      service.createMilestone(
        'agreement-1',
        {
          acceptanceCriteria: [{ description: 'Logo delivered in SVG format' }],
          amount: '2500.00',
          orderIndex: 1,
          title: 'Brand identity delivery',
        },
        'user-1',
      ),
    ).rejects.toThrow('payment helper failed');

    expect(timelineEventsService.createEvent).not.toHaveBeenCalled();
  });

  it('rejects when the timeline event write fails and does not return a success payload', async () => {
    const tx = {
      agreement: {
        findFirst: jest.fn().mockResolvedValue({
          currency: 'SAR',
          freelancerId: 'user-1',
          id: 'agreement-1',
          status: AgreementStatus.DRAFT,
          totalAmount: new Prisma.Decimal('7500.00'),
        }),
      },
      milestone: {
        aggregate: jest.fn(),
        create: jest.fn().mockResolvedValue({
          acceptanceCriteria: [
            { description: 'Logo delivered in SVG format', required: true },
          ],
          agreementId: 'agreement-1',
          amount: new Prisma.Decimal('2500.00'),
          createdAt: new Date('2026-04-29T00:00:00.000Z'),
          currency: 'SAR',
          deliveryStatus: 'NOT_SUBMITTED',
          description: null,
          dueDate: null,
          id: 'milestone-1',
          order: 1,
          paymentStatus: 'WAITING',
          revisionLimit: 3,
          status: 'DRAFT',
          title: 'Brand identity delivery',
          updatedAt: new Date('2026-04-29T00:00:00.000Z'),
        }),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
      },
    };
    const paymentsService = {
      createPaymentForMilestone: jest.fn().mockResolvedValue(undefined),
      deleteWaitingPaymentForMilestone: jest.fn(),
      syncMilestonePaymentAmount: jest.fn(),
    };
    const timelineEventsService = {
      createEvent: jest
        .fn()
        .mockRejectedValue(new Error('timeline write failed')),
    };
    const service = new MilestonesService(
      {
        $transaction: jest.fn(
          async (callback: (client: typeof tx) => Promise<unknown>) =>
            callback(tx),
        ),
        agreement: tx.agreement,
        milestone: tx.milestone,
      } as unknown as PrismaService,
      paymentsService as unknown as PaymentsService,
      timelineEventsService as unknown as TimelineEventsService,
    );

    await expect(
      service.createMilestone(
        'agreement-1',
        {
          acceptanceCriteria: [{ description: 'Logo delivered in SVG format' }],
          amount: '2500.00',
          orderIndex: 1,
          title: 'Brand identity delivery',
        },
        'user-1',
      ),
    ).rejects.toThrow('timeline write failed');

    expect(paymentsService.createPaymentForMilestone).toHaveBeenCalledTimes(1);
  });
});
