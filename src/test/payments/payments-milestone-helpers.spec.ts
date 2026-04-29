import {
  PaymentOperationType as PrismaPaymentOperationType,
  PaymentStatus as PrismaPaymentStatus,
} from '@prisma/client';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { PaymentsService } from '../../modules/payments/payments.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

type PaymentDelegateMock = {
  create: jest.Mock;
  delete: jest.Mock;
  findFirst: jest.Mock;
  update: jest.Mock;
};

type PrismaServiceMock = {
  payment: PaymentDelegateMock;
};

function createPaymentRecord(overrides: Record<string, unknown> = {}) {
  return {
    agreementId: 'agreement-1',
    amount: '2500.00',
    createdAt: new Date('2026-04-29T00:00:00.000Z'),
    currency: 'SAR',
    demoMode: true,
    id: 'payment-1',
    milestoneId: 'milestone-1',
    operationType: PrismaPaymentOperationType.FUND_MILESTONE,
    releasedAt: null,
    reservedAt: null,
    status: PrismaPaymentStatus.WAITING,
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

describe('PaymentsService milestone helpers', () => {
  let service: PaymentsService;
  let prisma: PrismaServiceMock;
  let tx: { payment: PaymentDelegateMock };

  beforeEach(() => {
    prisma = {
      payment: {
        create: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    tx = { payment: prisma.payment };
    service = new PaymentsService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentForMilestone', () => {
    it('creates a waiting demo milestone payment', async () => {
      prisma.payment.create.mockResolvedValue(createPaymentRecord());

      await service.createPaymentForMilestone(tx as never, {
        agreementId: 'agreement-1',
        amount: '2500.00',
        currency: 'SAR',
        milestoneId: 'milestone-1',
      });

      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          agreementId: 'agreement-1',
          amount: '2500.00',
          currency: 'SAR',
          demoMode: true,
          milestoneId: 'milestone-1',
          operationType: PrismaPaymentOperationType.FUND_MILESTONE,
          status: PrismaPaymentStatus.WAITING,
        },
      });
    });
  });

  describe('syncMilestonePaymentAmount', () => {
    it('updates the milestone payment amount', async () => {
      prisma.payment.findFirst.mockResolvedValue(createPaymentRecord());
      prisma.payment.update.mockResolvedValue(
        createPaymentRecord({ amount: '2750.00' }),
      );

      await service.syncMilestonePaymentAmount(tx as never, {
        amount: '2750.00',
        milestoneId: 'milestone-1',
      });

      expect(prisma.payment.findFirst).toHaveBeenCalledWith({
        where: {
          milestoneId: 'milestone-1',
          operationType: PrismaPaymentOperationType.FUND_MILESTONE,
        },
      });
      expect(prisma.payment.update).toHaveBeenCalledWith({
        data: { amount: '2750.00' },
        where: { id: 'payment-1' },
      });
    });

    it('throws PAYMENT_NOT_FOUND when no linked payment exists', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await expectAppException(
        service.syncMilestonePaymentAmount(tx as never, {
          amount: '2750.00',
          milestoneId: 'milestone-1',
        }),
        ErrorCode.PAYMENT_NOT_FOUND,
      );
    });
  });

  describe('deleteWaitingPaymentForMilestone', () => {
    it('deletes a waiting milestone payment', async () => {
      prisma.payment.findFirst.mockResolvedValue(createPaymentRecord());
      prisma.payment.delete.mockResolvedValue(createPaymentRecord());

      await service.deleteWaitingPaymentForMilestone(tx as never, {
        milestoneId: 'milestone-1',
      });

      expect(prisma.payment.delete).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
      });
    });

    it('throws PAYMENT_NOT_FOUND when deleting a missing payment', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await expectAppException(
        service.deleteWaitingPaymentForMilestone(tx as never, {
          milestoneId: 'milestone-1',
        }),
        ErrorCode.PAYMENT_NOT_FOUND,
      );
    });

    it('throws MILESTONE_PAYMENT_NOT_WAITING when payment status is not WAITING', async () => {
      prisma.payment.findFirst.mockResolvedValue(
        createPaymentRecord({ status: PrismaPaymentStatus.RESERVED }),
      );

      await expectAppException(
        service.deleteWaitingPaymentForMilestone(tx as never, {
          milestoneId: 'milestone-1',
        }),
        ErrorCode.MILESTONE_PAYMENT_NOT_WAITING,
      );
    });
  });
});
