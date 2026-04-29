import {
  AgreementStatus,
  DeliveryStatus,
  MilestoneStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MilestonesService } from '../../modules/milestones/milestones.service';
import { PaymentsService } from '../../modules/payments/payments.service';
import { TimelineEventsService } from '../../modules/timeline-events/timeline-events.service';

const agreement = {
  currency: 'SAR',
  freelancerId: 'user-1',
  id: 'agreement-1',
  status: AgreementStatus.DRAFT,
  totalAmount: new Prisma.Decimal('7500.00'),
};

function createOwnedMilestone(
  overrides: Record<string, unknown> = {},
  status = AgreementStatus.DRAFT,
) {
  return {
    acceptanceCriteria: [{ description: 'Initial criterion', required: true }],
    agreement: { ...agreement, status },
    agreementId: 'agreement-1',
    amount: new Prisma.Decimal('2500.00'),
    createdAt: new Date('2026-04-29T00:00:00.000Z'),
    currency: 'SAR',
    deliveryStatus: DeliveryStatus.NOT_SUBMITTED,
    description: 'Initial description',
    dueDate: null,
    id: '11111111-1111-4111-8111-111111111111',
    order: 1,
    paymentStatus: PaymentStatus.WAITING,
    revisionLimit: 3,
    status: MilestoneStatus.DRAFT,
    title: 'Initial title',
    updatedAt: new Date('2026-04-29T00:00:00.000Z'),
    ...overrides,
  };
}

async function expectAppException(
  promise: Promise<unknown>,
  code: ErrorCode,
): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code });
}

describe('MilestonesService reorderMilestones', () => {
  let service: MilestonesService;
  let paymentsService: {
    createPaymentForMilestone: jest.Mock;
    deleteWaitingPaymentForMilestone: jest.Mock;
    syncMilestonePaymentAmount: jest.Mock;
  };
  let timelineEventsService: { createEvent: jest.Mock };
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
  let prismaTransaction: jest.Mock;

  const ids = [
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
  ];

  beforeEach(() => {
    tx = {
      agreement: { findFirst: jest.fn() },
      milestone: {
        aggregate: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    prismaTransaction = jest.fn(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );
    paymentsService = {
      createPaymentForMilestone: jest.fn(),
      deleteWaitingPaymentForMilestone: jest.fn(),
      syncMilestonePaymentAmount: jest.fn(),
    };
    timelineEventsService = {
      createEvent: jest.fn().mockResolvedValue(undefined),
    };
    service = new MilestonesService(
      {
        $transaction: prismaTransaction,
        agreement: tx.agreement,
        milestone: tx.milestone,
      } as unknown as PrismaService,
      paymentsService as unknown as PaymentsService,
      timelineEventsService as unknown as TimelineEventsService,
    );
  });

  it('reorders all agreement milestones inside a transaction', async () => {
    tx.milestone.findFirst.mockResolvedValue(
      createOwnedMilestone({ id: ids[0], order: 1 }),
    );
    tx.milestone.findMany
      .mockResolvedValueOnce([
        { id: ids[0], order: 1 },
        { id: ids[1], order: 2 },
        { id: ids[2], order: 3 },
      ])
      .mockResolvedValueOnce([
        createOwnedMilestone({ id: ids[1], order: 1 }),
        createOwnedMilestone({ id: ids[2], order: 2 }),
        createOwnedMilestone({ id: ids[0], order: 3 }),
      ]);

    const result = await service.reorderMilestones(
      ids[0],
      {
        milestones: [
          { milestoneId: ids[1], orderIndex: 1 },
          { milestoneId: ids[2], orderIndex: 2 },
          { milestoneId: ids[0], orderIndex: 3 },
        ],
      },
      'user-1',
    );

    expect(prismaTransaction).toHaveBeenCalledTimes(1);
    expect(tx.milestone.findFirst).toHaveBeenCalledWith({
      include: { agreement: true },
      where: {
        agreement: { freelancerId: 'user-1' },
        id: ids[0],
      },
    });
    expect(tx.milestone.findMany).toHaveBeenNthCalledWith(1, {
      select: { id: true, order: true },
      where: { agreementId: 'agreement-1' },
    });
    expect(tx.milestone.update).toHaveBeenCalledTimes(6);
    expect(tx.milestone.update).toHaveBeenNthCalledWith(1, {
      data: { order: -1 },
      where: { id: ids[0] },
    });
    expect(tx.milestone.update).toHaveBeenNthCalledWith(4, {
      data: { order: 3 },
      where: { id: ids[0] },
    });
    expect(tx.milestone.findMany).toHaveBeenNthCalledWith(2, {
      orderBy: { order: 'asc' },
      where: { agreementId: 'agreement-1' },
    });
    expect(paymentsService.createPaymentForMilestone).not.toHaveBeenCalled();
    expect(paymentsService.syncMilestonePaymentAmount).not.toHaveBeenCalled();
    expect(
      paymentsService.deleteWaitingPaymentForMilestone,
    ).not.toHaveBeenCalled();
    expect(timelineEventsService.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'user-1',
        agreementId: 'agreement-1',
        metadata: expect.objectContaining({
          orderedMilestoneIds: [ids[1], ids[2], ids[0]],
          order: [
            { milestoneId: ids[1], orderIndex: 1 },
            { milestoneId: ids[2], orderIndex: 2 },
            { milestoneId: ids[0], orderIndex: 3 },
          ],
        }) as unknown,
        type: 'MILESTONES_REORDERED',
      }),
      tx,
    );
    expect(result).toEqual({
      data: [
        expect.objectContaining({ id: ids[1], orderIndex: 1 }),
        expect.objectContaining({ id: ids[2], orderIndex: 2 }),
        expect.objectContaining({ id: ids[0], orderIndex: 3 }),
      ],
    });
  });

  it('rejects duplicate order values before opening a transaction', async () => {
    await expectAppException(
      service.reorderMilestones(
        ids[0],
        {
          milestones: [
            { milestoneId: ids[0], orderIndex: 1 },
            { milestoneId: ids[1], orderIndex: 1 },
          ],
        },
        'user-1',
      ),
      ErrorCode.MILESTONE_INVALID_ORDER,
    );

    expect(prismaTransaction).not.toHaveBeenCalled();
  });

  it('rejects duplicate milestone IDs before opening a transaction', async () => {
    await expectAppException(
      service.reorderMilestones(
        ids[0],
        {
          milestones: [
            { milestoneId: ids[0], orderIndex: 1 },
            { milestoneId: ids[0], orderIndex: 2 },
          ],
        },
        'user-1',
      ),
      ErrorCode.MILESTONE_INVALID_ORDER,
    );

    expect(prismaTransaction).not.toHaveBeenCalled();
  });

  it('rejects empty reorder payloads before opening a transaction', async () => {
    await expectAppException(
      service.reorderMilestones(ids[0], { milestones: [] }, 'user-1'),
      ErrorCode.MILESTONE_INVALID_ORDER,
    );

    expect(prismaTransaction).not.toHaveBeenCalled();
  });

  it('rejects non-contiguous order values before opening a transaction', async () => {
    await expectAppException(
      service.reorderMilestones(
        ids[0],
        {
          milestones: [
            { milestoneId: ids[0], orderIndex: 1 },
            { milestoneId: ids[1], orderIndex: 3 },
          ],
        },
        'user-1',
      ),
      ErrorCode.MILESTONE_INVALID_ORDER,
    );

    expect(prismaTransaction).not.toHaveBeenCalled();
  });

  it('rejects reorder requests that omit agreement milestones', async () => {
    tx.milestone.findFirst.mockResolvedValue(
      createOwnedMilestone({ id: ids[0], order: 1 }),
    );
    tx.milestone.findMany.mockResolvedValueOnce([
      { id: ids[0], order: 1 },
      { id: ids[1], order: 2 },
      { id: ids[2], order: 3 },
    ]);

    await expectAppException(
      service.reorderMilestones(
        ids[0],
        {
          milestones: [
            { milestoneId: ids[0], orderIndex: 1 },
            { milestoneId: ids[1], orderIndex: 2 },
          ],
        },
        'user-1',
      ),
      ErrorCode.MILESTONE_INVALID_ORDER,
    );

    expect(tx.milestone.update).not.toHaveBeenCalled();
    expect(timelineEventsService.createEvent).not.toHaveBeenCalled();
  });

  it('rejects reorder requests with milestones from another agreement', async () => {
    tx.milestone.findFirst.mockResolvedValue(
      createOwnedMilestone({ id: ids[0], order: 1 }),
    );
    tx.milestone.findMany.mockResolvedValueOnce([
      { id: ids[0], order: 1 },
      { id: ids[1], order: 2 },
    ]);

    await expectAppException(
      service.reorderMilestones(
        ids[0],
        {
          milestones: [
            { milestoneId: ids[0], orderIndex: 1 },
            { milestoneId: ids[2], orderIndex: 2 },
          ],
        },
        'user-1',
      ),
      ErrorCode.MILESTONE_INVALID_ORDER,
    );

    expect(tx.milestone.update).not.toHaveBeenCalled();
    expect(timelineEventsService.createEvent).not.toHaveBeenCalled();
  });

  it('throws MILESTONE_NOT_FOUND when the route milestone is missing or not owned', async () => {
    tx.milestone.findFirst.mockResolvedValue(null);

    await expectAppException(
      service.reorderMilestones(
        ids[0],
        { milestones: [{ milestoneId: ids[0], orderIndex: 1 }] },
        'user-1',
      ),
      ErrorCode.MILESTONE_NOT_FOUND,
    );

    expect(timelineEventsService.createEvent).not.toHaveBeenCalled();
  });

  it('throws AGREEMENT_CANNOT_BE_MODIFIED when the parent agreement is not draft', async () => {
    tx.milestone.findFirst.mockResolvedValue(
      createOwnedMilestone({ id: ids[0], order: 1 }, AgreementStatus.ACTIVE),
    );

    await expectAppException(
      service.reorderMilestones(
        ids[0],
        { milestones: [{ milestoneId: ids[0], orderIndex: 1 }] },
        'user-1',
      ),
      ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED,
    );

    expect(tx.milestone.findMany).not.toHaveBeenCalled();
    expect(timelineEventsService.createEvent).not.toHaveBeenCalled();
  });
});
