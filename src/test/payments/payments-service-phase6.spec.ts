import { PaymentStatus } from '@prisma/client';
import { ClsService } from '../../common/cls/cls.service';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaymentsService } from '../../modules/payments/payments.service';
import { TimelineEventsService } from '../../modules/timeline-events/timeline-events.service';

describe('PaymentsService phase 6 additions', () => {
  let service: PaymentsService;
  let mockPrisma: {
    $transaction: jest.Mock;
    agreement: { findUnique: jest.Mock };
    milestone: { update: jest.Mock };
    payment: {
      create: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let mockTimeline: { createEvent: jest.Mock };
  let clsServiceMock: { getContext: jest.Mock; setContext: jest.Mock };

  beforeEach(() => {
    mockPrisma = {
      payment: {
        create: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      milestone: { update: jest.fn() },
      agreement: { findUnique: jest.fn() },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };
    mockTimeline = {
      createEvent: jest.fn().mockResolvedValue({ id: 'timeline-1' }),
    };
    clsServiceMock = {
      getContext: jest.fn(),
      setContext: jest.fn(),
    };

    service = new PaymentsService(
      mockPrisma as unknown as PrismaService,
      mockTimeline as unknown as TimelineEventsService,
      clsServiceMock as unknown as ClsService,
    );
  });

  describe('receipt and reference generators', () => {
    it('generates receipt numbers in the expected format', () => {
      const receipt = (service as any).generateReceiptNumber() as string;

      expect(receipt).toMatch(/^DHM-\d{8}-[A-Z0-9]{6}$/);
    });

    it('generates unique receipt numbers across repeated calls', () => {
      const receipts = new Set(
        Array.from({ length: 20 }, () =>
          (service as any).generateReceiptNumber(),
        ),
      );

      expect(receipts.size).toBe(20);
    });

    it('generates transaction references in the expected format', () => {
      const reference = (
        service as any
      ).generateTransactionReference() as string;

      expect(reference).toMatch(/^TXN-[a-z0-9]{24}$/);
    });

    it('generates unique transaction references across repeated calls', () => {
      const references = new Set(
        Array.from({ length: 20 }, () =>
          (service as any).generateTransactionReference(),
        ),
      );

      expect(references.size).toBe(20);
    });
  });

  describe('portal auth edge cases', () => {
    it('rejects portal funding when CLS portal context is missing', async () => {
      clsServiceMock.getContext.mockReturnValue(undefined);

      await expect(
        service.portalFund('payment-token', 'payment-id', {
          amount: '1500.00',
        }),
      ).rejects.toMatchObject({ code: ErrorCode.PORTAL_TOKEN_INVALID });
      expect(mockPrisma.payment.findUnique).not.toHaveBeenCalled();
    });

    it('rejects portal funding when portal token scope is not allowed', async () => {
      clsServiceMock.getContext.mockReturnValue({
        agreementId: 'agreement-1',
        portalTokenId: 'portal-token-1',
        portalTokenType: 'DELIVERY_REVIEW',
      });

      await expect(
        service.portalFund('release-token', 'payment-id', {
          amount: '1500.00',
        }),
      ).rejects.toMatchObject({ code: ErrorCode.PORTAL_ACTION_NOT_ALLOWED });
      expect(mockPrisma.payment.findUnique).not.toHaveBeenCalled();
    });

    it('rejects portal release when the client did not confirm release', async () => {
      clsServiceMock.getContext.mockReturnValue({
        agreementId: 'agreement-1',
        portalTokenId: 'portal-token-1',
        portalTokenType: 'DELIVERY_REVIEW',
      });

      await expect(
        service.portalReleaseConfirmation('release-token', 'payment-id', {
          confirmed: false,
        }),
      ).rejects.toMatchObject({ code: ErrorCode.PORTAL_ACTION_NOT_ALLOWED });
      expect(mockPrisma.payment.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('controller compatibility aliases', () => {
    it('getById rejects when the authenticated user is missing', async () => {
      await expect(service.getById('payment-id')).rejects.toMatchObject({
        code: ErrorCode.UNAUTHORIZED,
      });
    });

    it('getReceipt rejects when the authenticated user is missing', async () => {
      await expect(service.getReceipt('payment-id')).rejects.toMatchObject({
        code: ErrorCode.UNAUTHORIZED,
      });
    });

    it('listByAgreementId rejects when the authenticated user is missing', async () => {
      await expect(
        service.listByAgreementId('agreement-id'),
      ).rejects.toMatchObject({
        code: ErrorCode.UNAUTHORIZED,
      });
    });
  });

  describe('state machine guard rails', () => {
    it('rejects unsupported terminal transitions through validateTransition', () => {
      expect(() =>
        service.validateTransition(
          PaymentStatus.NOT_REQUIRED,
          PaymentStatus.CLIENT_REVIEW,
        ),
      ).toThrow();
    });
  });
});
