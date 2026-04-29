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
    deliveryStatus: DeliveryStatus.NOT_SUBMITTED,
    description: 'Initial description',
    dueDate: null,
    id: 'milestone-1',
    order: 3,
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

describe('MilestonesService getMilestone', () => {
  let service: MilestonesService;
  let milestoneFindFirst: jest.Mock;

  beforeEach(() => {
    milestoneFindFirst = jest.fn();
    service = new MilestonesService(
      {
        $transaction: jest.fn(),
        agreement: { findFirst: jest.fn() },
        milestone: {
          aggregate: jest.fn(),
          create: jest.fn(),
          delete: jest.fn(),
          findFirst: milestoneFindFirst,
          findMany: jest.fn(),
          update: jest.fn(),
        },
      } as unknown as PrismaService,
      {
        createPaymentForMilestone: jest.fn(),
        deleteWaitingPaymentForMilestone: jest.fn(),
        syncMilestonePaymentAmount: jest.fn(),
      } as unknown as PaymentsService,
      {
        createEvent: jest.fn(),
      } as unknown as TimelineEventsService,
    );
  });

  it('returns one owned milestone and maps order to orderIndex', async () => {
    milestoneFindFirst.mockResolvedValue(createOwnedMilestone());

    const result: unknown = await service.getMilestone('milestone-1', 'user-1');
    const expectedData = expect.objectContaining({
      acceptanceCriteria: [
        { description: 'Initial criterion', required: true },
      ],
      agreementId: 'agreement-1',
      amount: '2500.00',
      createdAt: '2026-04-29T00:00:00.000Z',
      currency: 'SAR',
      deliveryStatus: DeliveryStatus.NOT_SUBMITTED,
      description: 'Initial description',
      dueDate: null,
      id: 'milestone-1',
      orderIndex: 3,
      paymentStatus: PaymentStatus.WAITING,
      revisionLimit: 3,
      status: MilestoneStatus.DRAFT,
      title: 'Initial title',
      updatedAt: '2026-04-29T00:00:00.000Z',
    }) as unknown;

    expect(result).toEqual({
      data: expectedData,
    });
  });

  it('does not call payment helpers, timeline helpers, or transactions during reads', async () => {
    milestoneFindFirst.mockResolvedValue(createOwnedMilestone());
    const transaction = jest.fn();
    const paymentsService = {
      createPaymentForMilestone: jest.fn(),
      deleteWaitingPaymentForMilestone: jest.fn(),
      syncMilestonePaymentAmount: jest.fn(),
    };
    const timelineEventsService = {
      createEvent: jest.fn(),
    };
    service = new MilestonesService(
      {
        $transaction: transaction,
        agreement: { findFirst: jest.fn() },
        milestone: {
          aggregate: jest.fn(),
          create: jest.fn(),
          delete: jest.fn(),
          findFirst: milestoneFindFirst,
          findMany: jest.fn(),
          update: jest.fn(),
        },
      } as unknown as PrismaService,
      paymentsService as unknown as PaymentsService,
      timelineEventsService as unknown as TimelineEventsService,
    );

    await service.getMilestone('milestone-1', 'user-1');

    expect(transaction).not.toHaveBeenCalled();
    expect(paymentsService.createPaymentForMilestone).not.toHaveBeenCalled();
    expect(paymentsService.syncMilestonePaymentAmount).not.toHaveBeenCalled();
    expect(
      paymentsService.deleteWaitingPaymentForMilestone,
    ).not.toHaveBeenCalled();
    expect(timelineEventsService.createEvent).not.toHaveBeenCalled();
  });

  it('throws MILESTONE_NOT_FOUND for wrong owner or missing milestone', async () => {
    milestoneFindFirst.mockResolvedValue(null);

    await expectAppException(
      service.getMilestone('milestone-1', 'user-1'),
      ErrorCode.MILESTONE_NOT_FOUND,
    );
  });
});
