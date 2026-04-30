import { AgreementStatus, MilestoneStatus, PaymentStatus } from '@prisma/client';
import { MilestonesService } from '../milestones.service';

describe('MilestonesService agreement coordination', () => {
  const agreementId = 'agreement-001';
  const milestoneId = 'milestone-001';
  const userId = 'freelancer-001';

  const prisma: any = { $transaction: jest.fn() };
  const paymentsService: any = {
    createPaymentForMilestone: jest.fn().mockResolvedValue({}),
    syncMilestonePaymentAmount: jest.fn().mockResolvedValue({}),
    deleteWaitingPaymentForMilestone: jest.fn().mockResolvedValue({}),
  };
  const timelineEventsService: any = {
    createEvent: jest.fn().mockResolvedValue({}),
  };
  const agreementsService: any = {
    recalculateTotalAmount: jest.fn().mockResolvedValue({ agreementId, totalAmount: 250 }),
  };

  function buildService() {
    return new MilestonesService(
      prisma,
      paymentsService,
      timelineEventsService,
      agreementsService,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recalculates totals after milestone creation', async () => {
    const service = buildService();
    const tx: any = {
      milestone: {
        create: jest.fn().mockResolvedValue({
          id: milestoneId,
          title: 'M1',
          amount: '250.00',
          currency: 'SAR',
          order: 1,
          status: MilestoneStatus.DRAFT,
          paymentStatus: PaymentStatus.WAITING,
          deliveryStatus: 'NOT_SUBMITTED',
          createdAt: new Date(),
          updatedAt: new Date(),
          dueDate: null,
          description: null,
          revisionLimit: 3,
          agreementId,
          acceptanceCriteria: [],
        }),
      },
    };

    jest.spyOn(service as any, 'findOwnedAgreement').mockResolvedValue({
      id: agreementId,
      currency: 'SAR',
      freelancerId: userId,
      status: AgreementStatus.DRAFT,
      totalAmount: { toFixed: () => '0' },
    });
    jest.spyOn(service as any, 'assertOrderAvailable').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'calculateAmountSummary').mockResolvedValue({
      agreementTotalAmount: '250.00',
      amountMatch: true,
      amountWarning: undefined,
      currency: 'SAR',
      totalAmount: '250.00',
    });
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await service.createMilestone(
      agreementId,
      {
        title: 'M1',
        amount: '250.00',
        acceptanceCriteria: [],
        orderIndex: 1,
      } as any,
      userId,
    );

    expect(agreementsService.recalculateTotalAmount).toHaveBeenCalledWith(tx, agreementId);
  });

  it('recalculates totals after milestone amount updates', async () => {
    const service = buildService();
    const tx: any = {
      milestone: {
        update: jest.fn().mockResolvedValue({
          id: milestoneId,
          title: 'M1',
          amount: '300.00',
          currency: 'SAR',
          order: 1,
          status: MilestoneStatus.DRAFT,
          paymentStatus: PaymentStatus.WAITING,
          deliveryStatus: 'NOT_SUBMITTED',
          createdAt: new Date(),
          updatedAt: new Date(),
          dueDate: null,
          description: null,
          revisionLimit: 3,
          agreementId,
          acceptanceCriteria: [],
        }),
      },
    };

    jest.spyOn(service as any, 'findOwnedMilestoneWithAgreement').mockResolvedValue({
      id: milestoneId,
      title: 'M1',
      amount: '250.00',
      currency: 'SAR',
      order: 1,
      status: MilestoneStatus.DRAFT,
      paymentStatus: PaymentStatus.WAITING,
      deliveryStatus: 'NOT_SUBMITTED',
      createdAt: new Date(),
      updatedAt: new Date(),
      dueDate: null,
      description: null,
      revisionLimit: 3,
      agreement: {
        id: agreementId,
        currency: 'SAR',
        freelancerId: userId,
        status: AgreementStatus.DRAFT,
        totalAmount: { toFixed: () => '0' },
      },
      acceptanceCriteria: [],
    });
    jest.spyOn(service as any, 'calculateAmountSummary').mockResolvedValue({
      agreementTotalAmount: '300.00',
      amountMatch: true,
      amountWarning: undefined,
      currency: 'SAR',
      totalAmount: '300.00',
    });
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await service.updateMilestone(milestoneId, { amount: '300.00' } as any, userId);

    expect(agreementsService.recalculateTotalAmount).toHaveBeenCalledWith(tx, agreementId);
  });

  it('recalculates totals after milestone deletion', async () => {
    const service = buildService();
    const tx: any = {
      milestone: { delete: jest.fn().mockResolvedValue({}) },
    };

    jest.spyOn(service as any, 'findOwnedMilestoneWithAgreement').mockResolvedValue({
      id: milestoneId,
      title: 'M1',
      amount: '250.00',
      currency: 'SAR',
      order: 1,
      status: MilestoneStatus.DRAFT,
      paymentStatus: PaymentStatus.WAITING,
      deliveryStatus: 'NOT_SUBMITTED',
      createdAt: new Date(),
      updatedAt: new Date(),
      dueDate: null,
      description: null,
      revisionLimit: 3,
      agreement: {
        id: agreementId,
        currency: 'SAR',
        freelancerId: userId,
        status: AgreementStatus.DRAFT,
        totalAmount: { toFixed: () => '0' },
      },
      acceptanceCriteria: [],
    });
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await service.deleteMilestone(milestoneId, userId);

    expect(agreementsService.recalculateTotalAmount).toHaveBeenCalledWith(tx, agreementId);
  });
});
