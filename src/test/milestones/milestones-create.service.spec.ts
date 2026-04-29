import {
  AgreementStatus,
  DeliveryStatus,
  MilestoneStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PaymentsService } from '../../modules/payments/payments.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MilestonesService } from '../../modules/milestones/milestones.service';
import { TimelineEventsService } from '../../modules/timeline-events/timeline-events.service';

type AgreementDelegateMock = {
  findFirst: jest.Mock;
};

type MilestoneDelegateMock = {
  aggregate: jest.Mock;
  create: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
};

type PrismaServiceMock = {
  $transaction: jest.Mock;
  agreement: AgreementDelegateMock;
  milestone: MilestoneDelegateMock;
};

type PaymentsServiceMock = {
  createPaymentForMilestone: jest.Mock;
  deleteWaitingPaymentForMilestone: jest.Mock;
  syncMilestonePaymentAmount: jest.Mock;
};

type TimelineEventsServiceMock = {
  createEvent: jest.Mock;
};

function createAgreement() {
  return {
    currency: 'SAR',
    freelancerId: 'user-1',
    id: 'agreement-1',
    status: AgreementStatus.DRAFT,
    totalAmount: new Prisma.Decimal('7500.00'),
  };
}

function createMilestone() {
  return {
    acceptanceCriteria: [
      { description: 'Logo delivered in SVG format', required: true },
    ],
    agreementId: 'agreement-1',
    amount: new Prisma.Decimal('2500.00'),
    createdAt: new Date('2026-04-29T00:00:00.000Z'),
    currency: 'SAR',
    deliveryStatus: DeliveryStatus.NOT_SUBMITTED,
    description: 'Initial logo and brand files',
    dueDate: new Date('2026-05-15T00:00:00.000Z'),
    id: 'milestone-1',
    order: 1,
    paymentStatus: PaymentStatus.WAITING,
    revisionLimit: 3,
    status: MilestoneStatus.DRAFT,
    title: 'Brand identity delivery',
    updatedAt: new Date('2026-04-29T00:00:00.000Z'),
  };
}

describe('MilestonesService createMilestone', () => {
  let service: MilestonesService;
  let prisma: PrismaServiceMock;
  let paymentsService: PaymentsServiceMock;
  let timelineEventsService: TimelineEventsServiceMock;
  let tx: {
    agreement: AgreementDelegateMock;
    milestone: MilestoneDelegateMock;
  };

  beforeEach(() => {
    tx = {
      agreement: { findFirst: jest.fn() },
      milestone: {
        aggregate: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };
    prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
      agreement: tx.agreement,
      milestone: tx.milestone,
    };
    paymentsService = {
      createPaymentForMilestone: jest.fn(),
      deleteWaitingPaymentForMilestone: jest.fn(),
      syncMilestonePaymentAmount: jest.fn(),
    };
    timelineEventsService = {
      createEvent: jest.fn().mockResolvedValue(undefined),
    };

    service = new MilestonesService(
      prisma as unknown as PrismaService,
      paymentsService as unknown as PaymentsService,
      timelineEventsService as unknown as TimelineEventsService,
    );
  });

  it('creates a milestone, creates the waiting payment, and returns an amount warning when totals mismatch', async () => {
    tx.agreement.findFirst.mockResolvedValue(createAgreement());
    tx.milestone.findFirst.mockResolvedValueOnce(null);
    tx.milestone.create.mockResolvedValue(createMilestone());
    paymentsService.createPaymentForMilestone.mockResolvedValue(undefined);
    tx.milestone.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal('2500.00') },
    });

    const result: unknown = await service.createMilestone(
      'agreement-1',
      {
        acceptanceCriteria: [{ description: 'Logo delivered in SVG format' }],
        amount: '2500.00',
        description: 'Initial logo and brand files',
        dueDate: '2026-05-15T00:00:00.000Z',
        orderIndex: 1,
        title: 'Brand identity delivery',
      },
      'user-1',
    );

    const expectedCreateData = expect.objectContaining({
      agreementId: 'agreement-1',
      currency: 'SAR',
      deliveryStatus: DeliveryStatus.NOT_SUBMITTED,
      order: 1,
      paymentStatus: PaymentStatus.WAITING,
      revisionLimit: 3,
      status: MilestoneStatus.DRAFT,
    }) as unknown;

    expect(tx.milestone.create).toHaveBeenCalledWith({
      data: expectedCreateData,
    });
    const expectedPaymentInput = expect.objectContaining({
      agreementId: 'agreement-1',
      amount: expect.any(Prisma.Decimal) as unknown,
      currency: 'SAR',
      milestoneId: 'milestone-1',
    }) as unknown;
    expect(paymentsService.createPaymentForMilestone).toHaveBeenCalledWith(
      tx,
      expectedPaymentInput,
    );
    expect(timelineEventsService.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'user-1',
        actorRole: 'FREELANCER',
        agreementId: 'agreement-1',
        metadata: expect.objectContaining({
          amount: '2500.00',
          currency: 'SAR',
          milestoneId: 'milestone-1',
          orderIndex: 1,
          status: MilestoneStatus.DRAFT,
          title: 'Brand identity delivery',
        }) as unknown,
        milestoneId: 'milestone-1',
        title: 'Milestone created',
        type: 'MILESTONE_CREATED',
      }),
      tx,
    );
    expect(result).toMatchObject({
      amountWarning: 'Milestone total does not match agreement total',
      data: {
        agreementId: 'agreement-1',
        amount: '2500.00',
        currency: 'SAR',
        deliveryStatus: DeliveryStatus.NOT_SUBMITTED,
        orderIndex: 1,
        paymentStatus: PaymentStatus.WAITING,
        revisionLimit: 3,
        status: MilestoneStatus.DRAFT,
      },
    });
  });
});
