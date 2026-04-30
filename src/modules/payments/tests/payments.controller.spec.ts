import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { PaymentsController } from '../payments.controller';
import { PaymentsService } from '../payments.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PortalTokenGuard } from '../../../common/guards/portal-token.guard';
import { ClsService } from '../../../common/cls/cls.service';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { AppException } from '../../../common/errors/app-exception';

const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174000';

class TestJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = { id: TEST_USER_ID };
    return true;
  }
}

class TestPortalTokenGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: Partial<PaymentsService>;

  beforeEach(async () => {
    paymentsService = {
      listByAgreementId: jest.fn().mockResolvedValue({
        payments: [],
        totalFunded: '0.00',
        totalReleased: '0.00',
        totalPending: '0.00',
        currency: 'SAR',
      }),
      fundMilestone: jest.fn().mockResolvedValue({
        id: 'test-id',
        agreementId: 'agreement-1',
        amount: '1000.00',
        currency: 'SAR',
        status: 'RESERVED',
        operationType: 'FUND_MILESTONE',
        demoMode: true,
        receiptNumber: 'DHM-20260429-ABC123',
        transactionReference: 'TXN-abcdefghijklmnopqrstuvwx',
        reservedAt: '2026-04-29T00:00:00.000Z',
        createdAt: '2026-04-29T00:00:00.000Z',
        updatedAt: '2026-04-29T00:00:00.000Z',
      }),
      release: jest.fn().mockResolvedValue({
        id: 'test-id',
        agreementId: 'agreement-1',
        amount: '1000.00',
        currency: 'SAR',
        status: 'RELEASED',
        operationType: 'FUND_MILESTONE',
        demoMode: true,
        releasedAt: '2026-04-29T00:00:00.000Z',
        createdAt: '2026-04-29T00:00:00.000Z',
        updatedAt: '2026-04-29T00:00:00.000Z',
      }),
      getById: jest.fn().mockResolvedValue({
        id: 'test-id',
        agreementId: 'agreement-1',
        amount: '1000.00',
        currency: 'SAR',
        status: 'WAITING',
        operationType: 'FUND_MILESTONE',
        demoMode: true,
        createdAt: '2026-04-29T00:00:00.000Z',
        updatedAt: '2026-04-29T00:00:00.000Z',
      }),
      getReceipt: jest.fn().mockResolvedValue({
        id: 'test-id',
        paymentId: 'test-id',
        receiptNumber: 'DHM-20260429-ABC123',
        transactionReference: 'TXN-abcdefghijklmnopqrstuvwx',
        amount: '1000.00',
        currency: 'SAR',
        status: 'RESERVED',
        operationType: 'FUND_MILESTONE',
        agreementId: 'agreement-1',
        demoMode: true,
        reservedAt: '2026-04-29T00:00:00.000Z',
        createdAt: '2026-04-29T00:00:00.000Z',
        issuedAt: '2026-04-29T00:00:00.000Z',
      }),
      portalFund: jest.fn().mockResolvedValue({
        id: 'test-id',
        agreementId: 'agreement-1',
        amount: '500.00',
        currency: 'SAR',
        status: 'RESERVED',
        operationType: 'FUND_MILESTONE',
        demoMode: true,
        receiptNumber: 'DHM-20260429-DEF456',
        transactionReference: 'TXN-portal1234567890123456',
        reservedAt: '2026-04-29T00:00:00.000Z',
        createdAt: '2026-04-29T00:00:00.000Z',
        updatedAt: '2026-04-29T00:00:00.000Z',
      }),
      portalReleaseConfirmation: jest.fn().mockResolvedValue({
        id: 'test-id',
        agreementId: 'agreement-1',
        amount: '500.00',
        currency: 'SAR',
        status: 'RELEASED',
        operationType: 'FUND_MILESTONE',
        demoMode: true,
        releasedAt: '2026-04-29T00:00:00.000Z',
        createdAt: '2026-04-29T00:00:00.000Z',
        updatedAt: '2026-04-29T00:00:00.000Z',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: paymentsService },
        { provide: ClsService, useValue: { getContext: jest.fn(), setContext: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtAuthGuard)
      .overrideGuard(PortalTokenGuard)
      .useClass(TestPortalTokenGuard)
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  // ============================================================
  // Phase 1: Controller existence and guard tests
  // ============================================================

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================================
  // Phase 2: listByAgreementId
  // ============================================================

  describe('listByAgreementId', () => {
    it('should delegate to paymentsService.listByAgreementId with userId', async () => {
      const agreementId = '123e4567-e89b-12d3-a456-426614174000';
      const result = await controller.listByAgreementId(agreementId, { id: TEST_USER_ID } as any);

      expect(paymentsService.listByAgreementId).toHaveBeenCalledWith(agreementId, TEST_USER_ID);
      expect(result).toHaveProperty('payments');
      expect(result).toHaveProperty('totalFunded');
      expect(result).toHaveProperty('totalReleased');
      expect(result).toHaveProperty('totalPending');
      expect(result).toHaveProperty('currency');
    });

    it('should propagate service errors', async () => {
      (paymentsService.listByAgreementId as jest.Mock).mockRejectedValue(
        new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND }),
      );
      const agreementId = '123e4567-e89b-12d3-a456-426614174000';
      await expect(
        controller.listByAgreementId(agreementId, { id: TEST_USER_ID } as any),
      ).rejects.toMatchObject({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    });
  });

  // ============================================================
  // Phase 2: fundMilestone
  // ============================================================

  describe('fundMilestone', () => {
    it('should delegate to paymentsService.fundMilestone with userId', async () => {
      const dto = { milestoneId: '123e4567-e89b-12d3-a456-426614174000', amount: '1000.00' };
      const result = await controller.fundMilestone(dto, { id: TEST_USER_ID } as any);

      expect(paymentsService.fundMilestone).toHaveBeenCalledWith(dto, TEST_USER_ID);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('status', 'RESERVED');
      expect(result).toHaveProperty('receiptNumber');
      expect(result).toHaveProperty('transactionReference');
      expect(result).toHaveProperty('reservedAt');
    });

    it('should propagate PAYMENT_NOT_FOUND', async () => {
      (paymentsService.fundMilestone as jest.Mock).mockRejectedValue(
        new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND }),
      );
      const dto = { milestoneId: '123e4567-e89b-12d3-a456-426614174000', amount: '1000.00' };
      await expect(
        controller.fundMilestone(dto, { id: TEST_USER_ID } as any),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_FOUND });
    });

    it('should propagate PAYMENT_ALREADY_RESERVED', async () => {
      (paymentsService.fundMilestone as jest.Mock).mockRejectedValue(
        new AppException({ code: ErrorCode.PAYMENT_ALREADY_RESERVED }),
      );
      const dto = { milestoneId: '123e4567-e89b-12d3-a456-426614174000', amount: '1000.00' };
      await expect(
        controller.fundMilestone(dto, { id: TEST_USER_ID } as any),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_ALREADY_RESERVED });
    });

    it('should propagate PAYMENT_INVALID_AMOUNT', async () => {
      (paymentsService.fundMilestone as jest.Mock).mockRejectedValue(
        new AppException({ code: ErrorCode.PAYMENT_INVALID_AMOUNT }),
      );
      const dto = { milestoneId: '123e4567-e89b-12d3-a456-426614174000', amount: '0.01' };
      await expect(
        controller.fundMilestone(dto, { id: TEST_USER_ID } as any),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_INVALID_AMOUNT });
    });
  });

  // ============================================================
  // Phase 2: release
  // ============================================================

  describe('release', () => {
    it('should delegate to paymentsService.release with userId', async () => {
      const dto = { paymentId: '123e4567-e89b-12d3-a456-426614174000' };
      const result = await controller.release(dto, { id: TEST_USER_ID } as any);

      expect(paymentsService.release).toHaveBeenCalledWith(dto, TEST_USER_ID);
      expect(result).toHaveProperty('status', 'RELEASED');
      expect(result).toHaveProperty('releasedAt');
    });

    it('should pass optional notes to service', async () => {
      const dto = {
        paymentId: '123e4567-e89b-12d3-a456-426614174000',
        notes: 'Client approved delivery',
      };
      await controller.release(dto, { id: TEST_USER_ID } as any);
      expect(paymentsService.release).toHaveBeenCalledWith(dto, TEST_USER_ID);
    });

    it('should propagate PAYMENT_NOT_READY_TO_RELEASE', async () => {
      (paymentsService.release as jest.Mock).mockRejectedValue(
        new AppException({ code: ErrorCode.PAYMENT_NOT_READY_TO_RELEASE }),
      );
      const dto = { paymentId: '123e4567-e89b-12d3-a456-426614174000' };
      await expect(
        controller.release(dto, { id: TEST_USER_ID } as any),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_READY_TO_RELEASE });
    });

    it('should propagate PAYMENT_ALREADY_RELEASED', async () => {
      (paymentsService.release as jest.Mock).mockRejectedValue(
        new AppException({ code: ErrorCode.PAYMENT_ALREADY_RELEASED }),
      );
      const dto = { paymentId: '123e4567-e89b-12d3-a456-426614174000' };
      await expect(
        controller.release(dto, { id: TEST_USER_ID } as any),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_ALREADY_RELEASED });
    });
  });

  // ============================================================
  // Phase 2: getById
  // ============================================================

  describe('getById', () => {
    it('should delegate to paymentsService.getById with userId', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const result = await controller.getById(id, { id: TEST_USER_ID } as any);

      expect(paymentsService.getById).toHaveBeenCalledWith(id, TEST_USER_ID);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('agreementId');
      expect(result).toHaveProperty('amount');
      expect(result).toHaveProperty('currency');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('demoMode');
    });

    it('should propagate PAYMENT_NOT_FOUND', async () => {
      (paymentsService.getById as jest.Mock).mockRejectedValue(
        new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND }),
      );
      await expect(
        controller.getById('nonexistent', { id: TEST_USER_ID } as any),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_FOUND });
    });
  });

  // ============================================================
  // Phase 2: getReceipt
  // ============================================================

  describe('getReceipt', () => {
    it('should delegate to paymentsService.getReceipt with userId', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const result = await controller.getReceipt(id, { id: TEST_USER_ID } as any);

      expect(paymentsService.getReceipt).toHaveBeenCalledWith(id, TEST_USER_ID);
      expect(result).toHaveProperty('receiptNumber', 'DHM-20260429-ABC123');
      expect(result).toHaveProperty('transactionReference');
      expect(result).toHaveProperty('amount');
      expect(result).toHaveProperty('agreementId');
    });

    it('should propagate PAYMENT_NOT_FOUND', async () => {
      (paymentsService.getReceipt as jest.Mock).mockRejectedValue(
        new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND }),
      );
      await expect(
        controller.getReceipt('nonexistent', { id: TEST_USER_ID } as any),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_FOUND });
    });
  });

  // ============================================================
  // Phase 4: portal endpoints
  // ============================================================

  describe('portalFund', () => {
    it('should delegate to paymentsService.portalFund', async () => {
      const token = 'test-token';
      const paymentId = '123e4567-e89b-12d3-a456-426614174000';
      const dto = { amount: '500.00' };
      const result = await controller.portalFund(token, paymentId, dto);

      expect(paymentsService.portalFund).toHaveBeenCalledWith(token, paymentId, dto);
      expect(result).toHaveProperty('status', 'RESERVED');
      expect(result).toHaveProperty('receiptNumber');
    });
  });

  describe('portalReleaseConfirmation', () => {
    it('should delegate to paymentsService.portalReleaseConfirmation', async () => {
      const token = 'test-token';
      const paymentId = '123e4567-e89b-12d3-a456-426614174000';
      const dto = { confirmed: true };
      const result = await controller.portalReleaseConfirmation(token, paymentId, dto);

      expect(paymentsService.portalReleaseConfirmation).toHaveBeenCalledWith(token, paymentId, dto);
      expect(result).toHaveProperty('status', 'RELEASED');
      expect(result).toHaveProperty('releasedAt');
    });
  });
});
