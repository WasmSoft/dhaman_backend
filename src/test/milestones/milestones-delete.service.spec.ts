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

describe('MilestonesService deleteMilestone', () => {
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
        aggregate: jest.fn(),
        create: jest.fn(),
        delete: jest.fn().mockResolvedValue({ id: 'milestone-1' }),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    paymentsService = {
      createPaymentForMilestone: jest.fn(),
      deleteWaitingPaymentForMilestone: jest.fn().mockResolvedValue(undefined),
      syncMilestonePaymentAmount: jest.fn(),
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

  it('deletes a milestone and its waiting payment', async () => {
    tx.milestone.findFirst.mockResolvedValue(createOwnedMilestone());

    const result = await service.deleteMilestone('milestone-1', 'user-1');

    expect(
      paymentsService.deleteWaitingPaymentForMilestone,
    ).toHaveBeenCalledWith(tx, {
      milestoneId: 'milestone-1',
    });
    expect(tx.milestone.delete).toHaveBeenCalledWith({
      where: { id: 'milestone-1' },
    });
    expect(timelineEventsService.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'user-1',
        agreementId: 'agreement-1',
        metadata: expect.objectContaining({
          amount: '2500.00',
          currency: 'SAR',
          milestoneId: 'milestone-1',
          orderIndex: 1,
          status: MilestoneStatus.DRAFT,
          title: 'Initial title',
        }) as unknown,
        milestoneId: 'milestone-1',
        type: 'MILESTONE_DELETED',
      }),
      tx,
    );
    expect(
      timelineEventsService.createEvent.mock.invocationCallOrder[0],
    ).toBeLessThan(tx.milestone.delete.mock.invocationCallOrder[0]);
    expect(result).toEqual({ success: true });
  });

  it('throws MILESTONE_NOT_FOUND for wrong owner or missing milestone', async () => {
    tx.milestone.findFirst.mockResolvedValue(null);

    await expectAppException(
      service.deleteMilestone('milestone-1', 'user-1'),
      ErrorCode.MILESTONE_NOT_FOUND,
    );
  });

  it('throws AGREEMENT_CANNOT_BE_MODIFIED when agreement is not draft', async () => {
    tx.milestone.findFirst.mockResolvedValue(
      createOwnedMilestone(AgreementStatus.ACTIVE),
    );

    await expectAppException(
      service.deleteMilestone('milestone-1', 'user-1'),
      ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED,
    );
  });

  it('bubbles MILESTONE_PAYMENT_NOT_WAITING from PaymentsService', async () => {
    tx.milestone.findFirst.mockResolvedValue(createOwnedMilestone());
    paymentsService.deleteWaitingPaymentForMilestone.mockRejectedValue(
      Object.assign(new Error('blocked'), {
        code: ErrorCode.MILESTONE_PAYMENT_NOT_WAITING,
      }),
    );

    await expectAppException(
      service.deleteMilestone('milestone-1', 'user-1'),
      ErrorCode.MILESTONE_PAYMENT_NOT_WAITING,
    );
  });

  it('bubbles payment delete failures and does not delete the milestone row', async () => {
    tx.milestone.findFirst.mockResolvedValue(createOwnedMilestone());
    paymentsService.deleteWaitingPaymentForMilestone.mockRejectedValue(
      new Error('payment delete failed'),
    );

    await expect(
      service.deleteMilestone('milestone-1', 'user-1'),
    ).rejects.toThrow('payment delete failed');

    expect(timelineEventsService.createEvent).not.toHaveBeenCalled();
    expect(tx.milestone.delete).not.toHaveBeenCalled();
  });
});
