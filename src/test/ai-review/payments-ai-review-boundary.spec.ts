import { PaymentOperationType, PaymentStatus } from '@prisma/client';
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

describe('PaymentsService transitionMilestonePaymentToAiReview', () => {
  it('moves a reviewable fund payment and milestone payment status to AI_REVIEW', async () => {
    const prisma = createPrismaMock();
    const service = new PaymentsService(prisma as never);

    prisma.payment.findFirst.mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.CLIENT_REVIEW,
    });

    await expect(
      service.transitionMilestonePaymentToAiReview({
        agreementId: 'agreement-1',
        milestoneId: 'milestone-1',
        deliveryId: 'delivery-1',
      }),
    ).resolves.toEqual({
      paymentId: 'payment-1',
      previousStatus: PaymentStatus.CLIENT_REVIEW,
      newStatus: PaymentStatus.AI_REVIEW,
    });

    expect(prisma.payment.findFirst).toHaveBeenCalledWith({
      where: {
        agreementId: 'agreement-1',
        milestoneId: 'milestone-1',
        operationType: PaymentOperationType.FUND_MILESTONE,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true },
    });
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: { status: PaymentStatus.AI_REVIEW },
    });
    expect(prisma.milestone.update).toHaveBeenCalledWith({
      where: { id: 'milestone-1' },
      data: { paymentStatus: PaymentStatus.AI_REVIEW },
    });
  });

  it('throws PAYMENT_NOT_FOUND when no milestone fund payment exists', async () => {
    const prisma = createPrismaMock();
    const service = new PaymentsService(prisma as never);

    prisma.payment.findFirst.mockResolvedValue(null);

    await expect(
      service.transitionMilestonePaymentToAiReview({
        agreementId: 'agreement-1',
        milestoneId: 'milestone-1',
        deliveryId: 'delivery-1',
      }),
    ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_FOUND });
  });

  it('throws PAYMENT_NOT_READY_TO_RELEASE for a non-reviewable payment status', async () => {
    const prisma = createPrismaMock();
    const service = new PaymentsService(prisma as never);

    prisma.payment.findFirst.mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.RELEASED,
    });

    await expect(
      service.transitionMilestonePaymentToAiReview({
        agreementId: 'agreement-1',
        milestoneId: 'milestone-1',
        deliveryId: 'delivery-1',
      }),
    ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_READY_TO_RELEASE });

    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(prisma.milestone.update).not.toHaveBeenCalled();
  });
});
