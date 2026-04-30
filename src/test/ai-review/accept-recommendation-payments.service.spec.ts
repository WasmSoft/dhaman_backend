import {
  AIRecommendation,
  PaymentOperationType,
  PaymentStatus,
} from '@prisma/client';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { PaymentsService } from '../../modules/payments/payments.service';

function createPrismaMock() {
  const prisma = {
    payment: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    milestone: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation(async (callback) => callback(prisma));

  return prisma;
}

describe('PaymentsService transitionPaymentFromAiReviewToOutcome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ACCEPT moves payment and milestone to READY_TO_RELEASE', async () => {
    const prisma = createPrismaMock();
    const service = new PaymentsService(prisma as never);

    prisma.payment.findFirst.mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.AI_REVIEW,
    });

    await expect(
      service.transitionPaymentFromAiReviewToOutcome(
        { agreementId: 'agreement-1', milestoneId: 'milestone-1' },
        AIRecommendation.ACCEPT,
      ),
    ).resolves.toEqual({
      paymentId: 'payment-1',
      newStatus: PaymentStatus.READY_TO_RELEASE,
    });

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: { status: PaymentStatus.READY_TO_RELEASE },
    });
    expect(prisma.milestone.update).toHaveBeenCalledWith({
      where: { id: 'milestone-1' },
      data: { paymentStatus: PaymentStatus.READY_TO_RELEASE },
    });
  });

  it('REJECT moves payment and milestone to ON_HOLD', async () => {
    const prisma = createPrismaMock();
    const service = new PaymentsService(prisma as never);

    prisma.payment.findFirst.mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.AI_REVIEW,
    });

    await expect(
      service.transitionPaymentFromAiReviewToOutcome(
        { agreementId: 'agreement-1', milestoneId: 'milestone-1' },
        AIRecommendation.REJECT,
      ),
    ).resolves.toEqual({
      paymentId: 'payment-1',
      newStatus: PaymentStatus.ON_HOLD,
    });

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: { status: PaymentStatus.ON_HOLD },
    });
    expect(prisma.milestone.update).toHaveBeenCalledWith({
      where: { id: 'milestone-1' },
      data: { paymentStatus: PaymentStatus.ON_HOLD },
    });
  });

  it('PARTIAL moves payment and milestone to ON_HOLD', async () => {
    const prisma = createPrismaMock();
    const service = new PaymentsService(prisma as never);

    prisma.payment.findFirst.mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.AI_REVIEW,
    });

    await expect(
      service.transitionPaymentFromAiReviewToOutcome(
        { agreementId: 'agreement-1', milestoneId: 'milestone-1' },
        AIRecommendation.PARTIAL,
      ),
    ).resolves.toEqual({
      paymentId: 'payment-1',
      newStatus: PaymentStatus.ON_HOLD,
    });

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: { status: PaymentStatus.ON_HOLD },
    });
    expect(prisma.milestone.update).toHaveBeenCalledWith({
      where: { id: 'milestone-1' },
      data: { paymentStatus: PaymentStatus.ON_HOLD },
    });
  });

  it('NEEDS_HUMAN_REVIEW leaves payment and milestone unchanged', async () => {
    const prisma = createPrismaMock();
    const service = new PaymentsService(prisma as never);

    prisma.payment.findFirst.mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.AI_REVIEW,
    });

    await expect(
      service.transitionPaymentFromAiReviewToOutcome(
        { agreementId: 'agreement-1', milestoneId: 'milestone-1' },
        AIRecommendation.NEEDS_HUMAN_REVIEW,
      ),
    ).resolves.toEqual({
      paymentId: 'payment-1',
      newStatus: PaymentStatus.AI_REVIEW,
    });

    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(prisma.milestone.update).not.toHaveBeenCalled();
  });

  it('throws PAYMENT_NOT_FOUND when no milestone fund payment exists', async () => {
    const prisma = createPrismaMock();
    const service = new PaymentsService(prisma as never);

    prisma.payment.findFirst.mockResolvedValue(null);

    await expect(
      service.transitionPaymentFromAiReviewToOutcome(
        { agreementId: 'agreement-1', milestoneId: 'milestone-1' },
        AIRecommendation.ACCEPT,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_FOUND });
  });

  it('throws PAYMENT_NOT_READY_TO_RELEASE when payment status is not AI_REVIEW', async () => {
    const prisma = createPrismaMock();
    const service = new PaymentsService(prisma as never);

    prisma.payment.findFirst.mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.READY_TO_RELEASE,
    });

    await expect(
      service.transitionPaymentFromAiReviewToOutcome(
        { agreementId: 'agreement-1', milestoneId: 'milestone-1' },
        AIRecommendation.ACCEPT,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_READY_TO_RELEASE });

    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(prisma.milestone.update).not.toHaveBeenCalled();
  });

  it('uses transaction client when provided', async () => {
    const prisma = createPrismaMock();
    const service = new PaymentsService(prisma as never);
    const tx = {
      payment: { findFirst: jest.fn(), update: jest.fn() },
      milestone: { update: jest.fn() },
    };

    tx.payment.findFirst.mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.AI_REVIEW,
    });

    await service.transitionPaymentFromAiReviewToOutcome(
      { agreementId: 'agreement-1', milestoneId: 'milestone-1' },
      AIRecommendation.ACCEPT,
      tx as never,
    );

    expect(tx.payment.findFirst).toHaveBeenCalled();
    expect(tx.payment.update).toHaveBeenCalled();
    expect(tx.milestone.update).toHaveBeenCalled();
    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
  });
});
