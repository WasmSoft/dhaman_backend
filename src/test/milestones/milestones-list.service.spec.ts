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

function createAgreement() {
  return {
    currency: 'SAR',
    freelancerId: 'user-1',
    id: 'agreement-1',
    status: AgreementStatus.DRAFT,
    totalAmount: new Prisma.Decimal('7500.00'),
  };
}

function createMilestone(overrides: Record<string, unknown> = {}) {
  return {
    acceptanceCriteria: [{ description: 'Criterion', required: true }],
    agreementId: 'agreement-1',
    amount: new Prisma.Decimal('2500.00'),
    createdAt: new Date('2026-04-29T00:00:00.000Z'),
    currency: 'SAR',
    deliveryStatus: DeliveryStatus.NOT_SUBMITTED,
    description: null,
    dueDate: null,
    id: 'milestone-1',
    order: 1,
    paymentStatus: PaymentStatus.WAITING,
    revisionLimit: 3,
    status: MilestoneStatus.DRAFT,
    title: 'Milestone',
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

describe('MilestonesService getAgreementMilestones', () => {
  let agreementFindFirst: jest.Mock;
  let milestoneFindMany: jest.Mock;
  let milestoneAggregate: jest.Mock;
  let service: MilestonesService;

  beforeEach(() => {
    agreementFindFirst = jest.fn();
    milestoneFindMany = jest.fn();
    milestoneAggregate = jest.fn();
    service = new MilestonesService(
      {
        $transaction: jest.fn(),
        agreement: { findFirst: agreementFindFirst },
        milestone: {
          aggregate: milestoneAggregate,
          create: jest.fn(),
          delete: jest.fn(),
          findFirst: jest.fn(),
          findMany: milestoneFindMany,
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

  it('returns ordered milestones and an accurate amount summary', async () => {
    agreementFindFirst.mockResolvedValue(createAgreement());
    milestoneFindMany.mockResolvedValue([
      createMilestone({ id: 'milestone-1', order: 1 }),
      createMilestone({
        amount: new Prisma.Decimal('5000.00'),
        id: 'milestone-2',
        order: 2,
      }),
    ]);
    milestoneAggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal('7500.00') },
    });

    const result = await service.getAgreementMilestones(
      'agreement-1',
      'user-1',
    );

    expect(milestoneFindMany).toHaveBeenCalledWith({
      orderBy: { order: 'asc' },
      where: { agreementId: 'agreement-1' },
    });
    expect(result).toEqual({
      agreementTotalAmount: '7500.00',
      amountMatch: true,
      currency: 'SAR',
      milestones: [
        expect.objectContaining({ id: 'milestone-1', orderIndex: 1 }),
        expect.objectContaining({ id: 'milestone-2', orderIndex: 2 }),
      ],
      totalAmount: '7500.00',
    });
  });

  it('returns an empty list with zero total when no milestones exist', async () => {
    agreementFindFirst.mockResolvedValue(createAgreement());
    milestoneFindMany.mockResolvedValue([]);
    milestoneAggregate.mockResolvedValue({ _sum: { amount: null } });

    const result = await service.getAgreementMilestones(
      'agreement-1',
      'user-1',
    );

    expect(result).toEqual({
      agreementTotalAmount: '7500.00',
      amountMatch: false,
      currency: 'SAR',
      milestones: [],
      totalAmount: '0.00',
    });
  });

  it('returns amountMatch false when totals do not match the agreement total', async () => {
    agreementFindFirst.mockResolvedValue(createAgreement());
    milestoneFindMany.mockResolvedValue([createMilestone()]);
    milestoneAggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal('2500.00') },
    });

    const result = await service.getAgreementMilestones(
      'agreement-1',
      'user-1',
    );

    expect(result).toMatchObject({
      agreementTotalAmount: '7500.00',
      amountMatch: false,
      currency: 'SAR',
      totalAmount: '2500.00',
    });
  });

  it('does not call payment helpers, timeline helpers, or transactions during list reads', async () => {
    agreementFindFirst.mockResolvedValue(createAgreement());
    milestoneFindMany.mockResolvedValue([]);
    milestoneAggregate.mockResolvedValue({ _sum: { amount: null } });
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
        agreement: { findFirst: agreementFindFirst },
        milestone: {
          aggregate: milestoneAggregate,
          create: jest.fn(),
          delete: jest.fn(),
          findFirst: jest.fn(),
          findMany: milestoneFindMany,
          update: jest.fn(),
        },
      } as unknown as PrismaService,
      paymentsService as unknown as PaymentsService,
      timelineEventsService as unknown as TimelineEventsService,
    );

    await service.getAgreementMilestones('agreement-1', 'user-1');

    expect(transaction).not.toHaveBeenCalled();
    expect(paymentsService.createPaymentForMilestone).not.toHaveBeenCalled();
    expect(paymentsService.syncMilestonePaymentAmount).not.toHaveBeenCalled();
    expect(
      paymentsService.deleteWaitingPaymentForMilestone,
    ).not.toHaveBeenCalled();
    expect(timelineEventsService.createEvent).not.toHaveBeenCalled();
  });

  it('throws AGREEMENT_NOT_FOUND for wrong owner or missing agreement', async () => {
    agreementFindFirst.mockResolvedValue(null);

    await expectAppException(
      service.getAgreementMilestones('agreement-1', 'user-1'),
      ErrorCode.AGREEMENT_NOT_FOUND,
    );
  });
});
