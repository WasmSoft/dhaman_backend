import { ErrorCode } from '../../../common/enums/error-code.enum';
import { AppException } from '../../../common/errors/app-exception';
import { createTestModule } from './client-portal.controller.test-utils';
import {
  VALID_TOKEN,
  PAYMENT_UUID,
  PAYMENT_A_UUID,
  PAYMENT_B_UUID,
  AGREEMENT_A_UUID,
  AGREEMENT_B_UUID,
} from './client-portal.controller.fixtures';
import type { ClientPortalService } from '../client-portal.service';
import type { ClientPortalController } from '../client-portal.controller';

describe('ClientPortalController — payments (US4)', () => {
  let controller: ClientPortalController;
  let serviceMock: ReturnType<typeof jest.mocked<ClientPortalService>>;

  beforeEach(async () => {
    const result = await createTestModule();
    controller = result.controller;
    serviceMock = result.serviceMock as any;
  });

  describe('getPayments', () => {
    it('should delegate to ClientPortalService.getPayments with token', async () => {
      const mockResponse = {
        agreementId: '223e4567-e89b-12d3-a456-426614174000',
        payments: [],
      };

      serviceMock.getPayments.mockResolvedValue(mockResponse);

      const result = await controller.getPayments(VALID_TOKEN);

      expect(serviceMock.getPayments).toHaveBeenCalledWith(VALID_TOKEN);
      expect(result).toEqual(mockResponse);
    });

    it('should propagate PORTAL_TOKEN_INVALID from service', async () => {
      serviceMock.getPayments.mockRejectedValue(
        new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID }),
      );

      await expect(controller.getPayments(VALID_TOKEN)).rejects.toMatchObject({
        code: ErrorCode.PORTAL_TOKEN_INVALID,
      });
    });

    it('should only return payments for token agreement A', async () => {
      const paymentsA = {
        agreementId: AGREEMENT_A_UUID,
        payments: [
          {
            id: PAYMENT_A_UUID,
            milestoneId: 'milestone-a1',
            milestoneTitle: 'Logo Design',
            amount: '2500.00',
            currency: 'SAR',
            status: 'WAITING',
            demoMode: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            fundedAt: undefined,
            releasedAt: undefined,
          },
        ],
      };
      serviceMock.getPayments.mockResolvedValue(paymentsA);

      const result = await controller.getPayments(VALID_TOKEN);

      expect(result.agreementId).toBe(AGREEMENT_A_UUID);
      expect(result.payments).toHaveLength(1);
      expect(result.payments[0].id).toBe(PAYMENT_A_UUID);
    });
  });

  describe('fundPayment', () => {
    it('should delegate to ClientPortalService.fundPayment with token, paymentId, and dto', async () => {
      const dto = { amount: '2500.00' };
      const mockResponse = {
        agreementId: '223e4567-e89b-12d3-a456-426614174000',
        id: PAYMENT_UUID,
        status: 'RESERVED',
        message: 'Payment funded.',
      };

      serviceMock.fundPayment.mockResolvedValue(mockResponse);

      const result = await controller.fundPayment(
        VALID_TOKEN,
        PAYMENT_UUID,
        dto,
      );

      expect(serviceMock.fundPayment).toHaveBeenCalledWith(
        VALID_TOKEN,
        PAYMENT_UUID,
        dto,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should propagate PAYMENT_NOT_FOUND from service', async () => {
      const dto = { amount: '2500.00' };
      serviceMock.fundPayment.mockRejectedValue(
        new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND }),
      );

      await expect(
        controller.fundPayment(VALID_TOKEN, PAYMENT_UUID, dto),
      ).rejects.toMatchObject({
        code: ErrorCode.PAYMENT_NOT_FOUND,
      });
    });

    it('should propagate PAYMENT_NOT_FUNDABLE from service', async () => {
      const dto = { amount: '2500.00' };
      serviceMock.fundPayment.mockRejectedValue(
        new AppException({ code: ErrorCode.PAYMENT_NOT_FUNDABLE }),
      );

      await expect(
        controller.fundPayment(VALID_TOKEN, PAYMENT_UUID, dto),
      ).rejects.toMatchObject({
        code: ErrorCode.PAYMENT_NOT_FUNDABLE,
      });
    });

    it('should reject funding cross-agreement payment (B with token A)', async () => {
      const dto = { amount: '1500.00' };
      serviceMock.fundPayment.mockRejectedValue(
        new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND }),
      );

      await expect(
        controller.fundPayment(VALID_TOKEN, PAYMENT_B_UUID, dto),
      ).rejects.toMatchObject({
        code: ErrorCode.PAYMENT_NOT_FOUND,
      });
    });
  });

  describe('releasePayment', () => {
    it('should delegate to ClientPortalService.releasePayment with token, paymentId, and dto', async () => {
      const dto = { confirmed: true, notes: 'Approved.' };
      const mockResponse = {
        agreementId: '223e4567-e89b-12d3-a456-426614174000',
        id: PAYMENT_UUID,
        status: 'RELEASED',
        message: 'Payment released.',
      };

      serviceMock.releasePayment.mockResolvedValue(mockResponse);

      const result = await controller.releasePayment(
        VALID_TOKEN,
        PAYMENT_UUID,
        dto,
      );

      expect(serviceMock.releasePayment).toHaveBeenCalledWith(
        VALID_TOKEN,
        PAYMENT_UUID,
        dto,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should propagate PAYMENT_NOT_FOUND from service', async () => {
      const dto = { confirmed: true };
      serviceMock.releasePayment.mockRejectedValue(
        new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND }),
      );

      await expect(
        controller.releasePayment(VALID_TOKEN, PAYMENT_UUID, dto),
      ).rejects.toMatchObject({
        code: ErrorCode.PAYMENT_NOT_FOUND,
      });
    });

    it('should reject releasing cross-agreement payment (B with token A)', async () => {
      const dto = { confirmed: true };
      serviceMock.releasePayment.mockRejectedValue(
        new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND }),
      );

      await expect(
        controller.releasePayment(VALID_TOKEN, PAYMENT_B_UUID, dto),
      ).rejects.toMatchObject({
        code: ErrorCode.PAYMENT_NOT_FOUND,
      });
    });
  });

  describe('getPaymentHistory', () => {
    it('should delegate to ClientPortalService.getPaymentHistory with token', async () => {
      const mockResponse = {
        agreementId: '223e4567-e89b-12d3-a456-426614174000',
        payments: [],
      };

      serviceMock.getPaymentHistory.mockResolvedValue(mockResponse);

      const result = await controller.getPaymentHistory(VALID_TOKEN);

      expect(serviceMock.getPaymentHistory).toHaveBeenCalledWith(VALID_TOKEN);
      expect(result).toEqual(mockResponse);
    });

    it('should propagate PORTAL_TOKEN_INVALID from service', async () => {
      serviceMock.getPaymentHistory.mockRejectedValue(
        new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID }),
      );

      await expect(
        controller.getPaymentHistory(VALID_TOKEN),
      ).rejects.toMatchObject({
        code: ErrorCode.PORTAL_TOKEN_INVALID,
      });
    });

    it('should only return payment history for token agreement A', async () => {
      const historyA = {
        agreementId: AGREEMENT_A_UUID,
        payments: [],
      };
      serviceMock.getPaymentHistory.mockResolvedValue(historyA);

      const result = await controller.getPaymentHistory(VALID_TOKEN);

      expect(result.agreementId).toBe(AGREEMENT_A_UUID);
    });
  });
});
