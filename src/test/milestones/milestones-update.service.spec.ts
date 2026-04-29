import {
  AgreementStatus,
  DeliveryStatus,
  MilestoneStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { PaymentsService } from '../../modules/payments/payments.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MilestonesService } from '../../modules/milestones/milestones.service';
import { TimelineEventsService } from '../../modules/timeline-events/timeline-events.service';

function createOwnedMilestone(status = AgreementStatus.DRAFT) {
  return {
    acceptanceCriteria: [{ description: 'Initial criterion', required: true }],
    agreement: {
      currency: 'SAR',
      freelancerId: 'user-1',
      id: 'agreement-1',
      status,
      totalAmount: new Prisma.Decimal('7500.00'),
    },
    agreementId: 'agreement-1',
    amount: new Prisma.Decimal('2500.00'),
    createdAt: new Date('2026-04-29T00:00:00.000Z'),
    currency: 'SAR',
    deliveryStatus: DeliveryStatus.NOT_SUBMITTED,
    description: 'Initial description',
    dueDate: null,
    id: 'milestone-1',
    order: 1,
    paymentStatus: PaymentStatus.WAITING,
    revisionLimit: 3,
    status: MilestoneStatus.DRAFT,
    title: 'Initial title',
    updatedAt: new Date('2026-04-29T00:00:00.000Z'),
  };
}

async function expectAppException(
  promise: Promise<unknown>,
  code: ErrorCode,
): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code });
}

describe('MilestonesService updateMilestone', () => {
  let service: MilestonesService;
  let tx: {
    agreement: { findFirst: jest.Mock };
    milestone: {
      aggregate: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let paymentsService: {
    createPaymentForMilestone: jest.Mock;
    deleteWaitingPaymentForMilestone: jest.Mock;
    syncMilestonePaymentAmount: jest.Mock;
  };
  let timelineEventsService: { createEvent: jest.Mock };

  beforeEach(() => {
    tx = {
      agreement: { findFirst: jest.fn() },
      milestone: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: new Prisma.Decimal('2750.00') },
        }),
        create: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    paymentsService = {
      createPaymentForMilestone: jest.fn(),
      deleteWaitingPaymentForMilestone: jest.fn(),
      syncMilestonePaymentAmount: jest.fn().mockResolvedValue(undefined),
    };
    timelineEventsService = {
      createEvent: jest.fn().mockResolvedValue(undefined),
    };
    service = new MilestonesService(
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
  });

  it('updates editable fields, defaults missing required flags, syncs payment amount, and returns an amount warning', async () => {
    tx.milestone.findFirst.mockResolvedValue(createOwnedMilestone());
    tx.milestone.update.mockResolvedValue(
      createOwnedMilestone()
        ? {
            ...createOwnedMilestone(),
            acceptanceCriteria: [
              { description: 'Updated criterion', required: true },
            ],
            amount: new Prisma.Decimal('2750.00'),
            description: 'Updated description',
            revisionLimit: 2,
            title: 'Updated title',
          }
        : null,
    );

    const result: unknown = await service.updateMilestone(
      'milestone-1',
      {
        acceptanceCriteria: [{ description: 'Updated criterion' }],
        amount: '2750.00',
        description: 'Updated description',
        revisionLimit: 2,
        title: 'Updated title',
      },
      'user-1',
    );

    const expectedUpdateData = expect.objectContaining({
      acceptanceCriteria: [
        { description: 'Updated criterion', required: true },
      ],
      amount: expect.any(Prisma.Decimal) as unknown,
      description: 'Updated description',
      revisionLimit: 2,
      title: 'Updated title',
    }) as unknown;

    expect(tx.milestone.update).toHaveBeenCalledWith({
      data: expectedUpdateData,
      where: { id: 'milestone-1' },
    });
    expect(paymentsService.syncMilestonePaymentAmount).toHaveBeenCalledWith(
      tx,
      {
        amount: expect.any(Prisma.Decimal) as unknown,
        milestoneId: 'milestone-1',
      },
    );
    expect(timelineEventsService.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'user-1',
        agreementId: 'agreement-1',
        metadata: expect.objectContaining({
          changedFields: [
            'title',
            'description',
            'amount',
            'acceptanceCriteria',
            'revisionLimit',
          ],
          milestoneId: 'milestone-1',
        }) as unknown,
        milestoneId: 'milestone-1',
        type: 'MILESTONE_UPDATED',
      }),
      tx,
    );
    expect(result).toMatchObject({
      amountWarning: 'Milestone total does not match agreement total',
      data: {
        amount: '2750.00',
        revisionLimit: 2,
        title: 'Updated title',
      },
    });
  });

  it('throws MILESTONE_NOT_FOUND for wrong owner or missing milestone', async () => {
    tx.milestone.findFirst.mockResolvedValue(null);

    await expectAppException(
      service.updateMilestone(
        'milestone-1',
        { title: 'Updated title' },
        'user-1',
      ),
      ErrorCode.MILESTONE_NOT_FOUND,
    );
  });

  it('throws AGREEMENT_CANNOT_BE_MODIFIED when agreement is not draft', async () => {
    tx.milestone.findFirst.mockResolvedValue(
      createOwnedMilestone(AgreementStatus.ACTIVE),
    );

    await expectAppException(
      service.updateMilestone(
        'milestone-1',
        { title: 'Updated title' },
        'user-1',
      ),
      ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED,
    );
  });

  it('does not update, sync payment, or emit a timeline event for an empty update body', async () => {
    tx.milestone.findFirst.mockResolvedValue(createOwnedMilestone());

    const result: unknown = await service.updateMilestone(
      'milestone-1',
      {},
      'user-1',
    );

    expect(tx.milestone.update).not.toHaveBeenCalled();
    expect(paymentsService.syncMilestonePaymentAmount).not.toHaveBeenCalled();
    expect(timelineEventsService.createEvent).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      amountWarning: 'Milestone total does not match agreement total',
      data: {
        id: 'milestone-1',
        title: 'Initial title',
      },
    });
  });

  it('bubbles payment sync failures and does not emit a timeline event', async () => {
    tx.milestone.findFirst.mockResolvedValue(createOwnedMilestone());
    tx.milestone.update.mockResolvedValue({
      ...createOwnedMilestone(),
      amount: new Prisma.Decimal('2750.00'),
    });
    paymentsService.syncMilestonePaymentAmount.mockRejectedValue(
      new Error('payment sync failed'),
    );

    await expect(
      service.updateMilestone('milestone-1', { amount: '2750.00' }, 'user-1'),
    ).rejects.toThrow('payment sync failed');

    expect(timelineEventsService.createEvent).not.toHaveBeenCalled();
  });
});
