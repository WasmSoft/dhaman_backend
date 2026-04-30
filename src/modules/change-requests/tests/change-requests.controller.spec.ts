import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ChangeRequestsController } from '../change-requests.controller';
import { ChangeRequestsService } from '../change-requests.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PortalTokenGuard } from '../../../common/guards/portal-token.guard';
import { ClsService } from '../../../common/cls/cls.service';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { AppException } from '../../../common/errors/app-exception';

const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174000';
const TEST_AGREEMENT_ID = '223e4567-e89b-12d3-a456-426614174000';
const TEST_CR_ID = '323e4567-e89b-12d3-a456-426614174000';

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

const mockChangeRequestResponse = {
  id: TEST_CR_ID,
  agreementId: TEST_AGREEMENT_ID,
  milestoneId: null,
  aiReviewId: null,
  requestedByRole: 'FREELANCER',
  title: 'Add extra landing page',
  description:
    'Client needs an additional landing page with hero section and contact form.',
  amount: '500.00',
  currency: 'USD',
  additionalTimelineText: null,
  timelineDays: null,
  acceptanceCriteria: ['Landing page delivered', 'Hero section included'],
  status: 'DRAFT',
  paymentStatus: 'WAITING',
  approvedAt: null,
  declinedAt: null,
  fundedAt: null,
  createdAt: '2026-04-30T00:00:00.000Z',
  updatedAt: '2026-04-30T00:00:00.000Z',
  payments: [],
};

const mockListResult = {
  data: [
    {
      id: TEST_CR_ID,
      agreementId: TEST_AGREEMENT_ID,
      milestoneId: null,
      title: 'Add extra landing page',
      amount: '500.00',
      currency: 'USD',
      status: 'DRAFT',
      paymentStatus: 'WAITING',
      createdAt: '2026-04-30T00:00:00.000Z',
      updatedAt: '2026-04-30T00:00:00.000Z',
    },
  ],
  total: 1,
};

describe('ChangeRequestsController', () => {
  let controller: ChangeRequestsController;
  let service: Partial<ChangeRequestsService>;

  beforeEach(async () => {
    service = {
      list: jest.fn().mockResolvedValue(mockListResult),
      create: jest.fn().mockResolvedValue(mockChangeRequestResponse),
      getById: jest.fn().mockResolvedValue(mockChangeRequestResponse),
      update: jest.fn().mockResolvedValue(mockChangeRequestResponse),
      send: jest
        .fn()
        .mockResolvedValue({ ...mockChangeRequestResponse, status: 'SENT' }),
      approveFromPortal: jest.fn().mockResolvedValue({
        ...mockChangeRequestResponse,
        status: 'APPROVED',
        approvedAt: '2026-04-30T01:00:00.000Z',
      }),
      declineFromPortal: jest.fn().mockResolvedValue({
        ...mockChangeRequestResponse,
        status: 'DECLINED',
        declinedAt: '2026-04-30T01:00:00.000Z',
      }),
      fundFromPortal: jest.fn().mockResolvedValue({
        ...mockChangeRequestResponse,
        status: 'FUNDED',
        fundedAt: '2026-04-30T01:00:00.000Z',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChangeRequestsController],
      providers: [
        { provide: ChangeRequestsService, useValue: service },
        {
          provide: ClsService,
          useValue: { getContext: jest.fn(), setContext: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtAuthGuard)
      .overrideGuard(PortalTokenGuard)
      .useClass(TestPortalTokenGuard)
      .compile();

    controller = module.get<ChangeRequestsController>(ChangeRequestsController);
  });

  // ============================================================
  // T008: Controller existence
  // ============================================================

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================================
  // T009: US1 — create and list delegation
  // ============================================================

  describe('list', () => {
    it('should delegate to changeRequestsService.list with agreementId and query', async () => {
      const query = { page: 1, limit: 10 };
      await controller.list(TEST_AGREEMENT_ID, query);

      expect(service.list).toHaveBeenCalledWith(TEST_AGREEMENT_ID, query);
    });

    it('should return paginated result with data and total', async () => {
      const result = await controller.list(TEST_AGREEMENT_ID, {});

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should propagate AGREEMENT_NOT_FOUND', async () => {
      (service.list as jest.Mock).mockRejectedValue(
        new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND }),
      );
      await expect(controller.list('nonexistent', {})).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_FOUND,
      });
    });
  });

  describe('create', () => {
    it('should delegate to changeRequestsService.create with agreementId and dto', async () => {
      const dto = {
        title: 'Add extra landing page',
        description:
          'Client needs an additional landing page with hero section.',
        amount: '500.00',
        currency: 'USD',
        acceptanceCriteria: ['Landing page delivered'],
      };
      await controller.create(TEST_AGREEMENT_ID, dto);

      expect(service.create).toHaveBeenCalledWith(TEST_AGREEMENT_ID, dto);
    });

    it('should return change request response on success', async () => {
      const dto = {
        title: 'Add extra landing page',
        description: 'Client needs an additional landing page.',
        amount: '500.00',
        currency: 'USD',
        acceptanceCriteria: ['Landing page delivered'],
      };
      const result = await controller.create(TEST_AGREEMENT_ID, dto);

      expect(result).toHaveProperty('id', TEST_CR_ID);
      expect(result).toHaveProperty('status', 'DRAFT');
    });

    it('should propagate CHANGE_REQUEST_AMOUNT_INVALID', async () => {
      (service.create as jest.Mock).mockRejectedValue(
        new AppException({ code: ErrorCode.CHANGE_REQUEST_AMOUNT_INVALID }),
      );
      const dto = {
        title: 'Test',
        description: 'Description for test.',
        amount: '0.00',
        currency: 'USD',
        acceptanceCriteria: ['Test'],
      };
      await expect(
        controller.create(TEST_AGREEMENT_ID, dto),
      ).rejects.toMatchObject({
        code: ErrorCode.CHANGE_REQUEST_AMOUNT_INVALID,
      });
    });
  });

  // ============================================================
  // T010: US1 — detail, update, and send delegation
  // ============================================================

  describe('getById', () => {
    it('should delegate to changeRequestsService.getById', async () => {
      await controller.getById(TEST_CR_ID);

      expect(service.getById).toHaveBeenCalledWith(TEST_CR_ID);
    });

    it('should return full change request detail', async () => {
      const result = await controller.getById(TEST_CR_ID);

      expect(result).toHaveProperty('id', TEST_CR_ID);
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('acceptanceCriteria');
      expect(result).toHaveProperty('payments');
    });

    it('should propagate CHANGE_REQUEST_NOT_FOUND', async () => {
      (service.getById as jest.Mock).mockRejectedValue(
        new AppException({ code: ErrorCode.CHANGE_REQUEST_NOT_FOUND }),
      );
      await expect(controller.getById('nonexistent')).rejects.toMatchObject({
        code: ErrorCode.CHANGE_REQUEST_NOT_FOUND,
      });
    });
  });

  describe('update', () => {
    it('should delegate to changeRequestsService.update with id and dto', async () => {
      const dto = { title: 'Updated title' };
      await controller.update(TEST_CR_ID, dto);

      expect(service.update).toHaveBeenCalledWith(TEST_CR_ID, dto);
    });

    it('should return updated change request', async () => {
      const dto = { title: 'Updated title' };
      const result = await controller.update(TEST_CR_ID, dto);

      expect(result).toHaveProperty('id', TEST_CR_ID);
      expect(result).toHaveProperty('title', 'Add extra landing page');
    });

    it('should propagate CHANGE_REQUEST_NOT_EDITABLE', async () => {
      (service.update as jest.Mock).mockRejectedValue(
        new AppException({ code: ErrorCode.CHANGE_REQUEST_NOT_EDITABLE }),
      );
      await expect(controller.update(TEST_CR_ID, {})).rejects.toMatchObject({
        code: ErrorCode.CHANGE_REQUEST_NOT_EDITABLE,
      });
    });
  });

  describe('send', () => {
    it('should delegate to changeRequestsService.send with id', async () => {
      await controller.send(TEST_CR_ID);

      expect(service.send).toHaveBeenCalledWith(TEST_CR_ID);
    });

    it('should return sent change request', async () => {
      const result = await controller.send(TEST_CR_ID);

      expect(result).toHaveProperty('status', 'SENT');
    });

    it('should propagate CHANGE_REQUEST_NOT_SENDABLE', async () => {
      (service.send as jest.Mock).mockRejectedValue(
        new AppException({ code: ErrorCode.CHANGE_REQUEST_NOT_SENDABLE }),
      );
      await expect(controller.send(TEST_CR_ID)).rejects.toMatchObject({
        code: ErrorCode.CHANGE_REQUEST_NOT_SENDABLE,
      });
    });
  });

  // ============================================================
  // T016: US2 — portal approve delegation
  // ============================================================

  describe('approveChangeRequest', () => {
    it('should delegate to changeRequestsService.approveFromPortal with changeRequestId', async () => {
      await controller.approveChangeRequest('test-token', TEST_CR_ID);

      expect(service.approveFromPortal).toHaveBeenCalledWith(TEST_CR_ID);
    });

    it('should return approved change request with approvedAt', async () => {
      const result = await controller.approveChangeRequest(
        'test-token',
        TEST_CR_ID,
      );

      expect(result).toHaveProperty('status', 'APPROVED');
      expect(result).toHaveProperty('approvedAt');
    });

    it('should accept token param without forwarding it to service', async () => {
      await controller.approveChangeRequest('some-token-value', TEST_CR_ID);
      expect(service.approveFromPortal).toHaveBeenCalledWith(TEST_CR_ID);
    });

    it('should propagate CHANGE_REQUEST_NOT_APPROVABLE', async () => {
      (service.approveFromPortal as jest.Mock).mockRejectedValue(
        new AppException({ code: ErrorCode.CHANGE_REQUEST_NOT_APPROVABLE }),
      );
      await expect(
        controller.approveChangeRequest('test-token', TEST_CR_ID),
      ).rejects.toMatchObject({
        code: ErrorCode.CHANGE_REQUEST_NOT_APPROVABLE,
      });
    });

    it('should propagate PORTAL_TOKEN_INVALID', async () => {
      (service.approveFromPortal as jest.Mock).mockRejectedValue(
        new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID }),
      );
      await expect(
        controller.approveChangeRequest('invalid-token', TEST_CR_ID),
      ).rejects.toMatchObject({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    });
  });

  // ============================================================
  // T017: US2 — portal decline delegation
  // ============================================================

  describe('declineChangeRequest', () => {
    it('should delegate to changeRequestsService.declineFromPortal with id and dto', async () => {
      const dto = { reason: 'The extra pages are not needed for this phase.' };
      await controller.declineChangeRequest('test-token', TEST_CR_ID, dto);

      expect(service.declineFromPortal).toHaveBeenCalledWith(TEST_CR_ID, dto);
    });

    it('should return declined change request with declinedAt', async () => {
      const dto = { reason: 'Not needed at this time, will revisit later.' };
      const result = await controller.declineChangeRequest(
        'test-token',
        TEST_CR_ID,
        dto,
      );

      expect(result).toHaveProperty('status', 'DECLINED');
      expect(result).toHaveProperty('declinedAt');
    });

    it('should propagate CHANGE_REQUEST_NOT_DECLINABLE', async () => {
      (service.declineFromPortal as jest.Mock).mockRejectedValue(
        new AppException({ code: ErrorCode.CHANGE_REQUEST_NOT_DECLINABLE }),
      );
      const dto = { reason: 'Not needed at this time, will revisit later.' };
      await expect(
        controller.declineChangeRequest('test-token', TEST_CR_ID, dto),
      ).rejects.toMatchObject({
        code: ErrorCode.CHANGE_REQUEST_NOT_DECLINABLE,
      });
    });

    it('should propagate PORTAL_TOKEN_INVALID', async () => {
      (service.declineFromPortal as jest.Mock).mockRejectedValue(
        new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID }),
      );
      const dto = { reason: 'Not needed at this time, will revisit later.' };
      await expect(
        controller.declineChangeRequest('invalid-token', TEST_CR_ID, dto),
      ).rejects.toMatchObject({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    });
  });

  // ============================================================
  // T023: US3 — portal fund body validation and delegation
  // ============================================================

  describe('fundChangeRequest', () => {
    it('should delegate to changeRequestsService.fundFromPortal with id and dto', async () => {
      const dto = { amount: '500.00' };
      await controller.fundChangeRequest('test-token', TEST_CR_ID, dto);

      expect(service.fundFromPortal).toHaveBeenCalledWith(TEST_CR_ID, dto);
    });

    it('should return funded change request with fundedAt', async () => {
      const dto = { amount: '500.00' };
      const result = await controller.fundChangeRequest(
        'test-token',
        TEST_CR_ID,
        dto,
      );

      expect(result).toHaveProperty('status', 'FUNDED');
      expect(result).toHaveProperty('fundedAt');
    });

    it('should pass paymentMethodLabel when provided', async () => {
      const dto = {
        amount: '500.00',
        paymentMethodLabel: 'Demo Bank Transfer',
      };
      await controller.fundChangeRequest('test-token', TEST_CR_ID, dto);

      expect(service.fundFromPortal).toHaveBeenCalledWith(TEST_CR_ID, dto);
    });

    // ============================================================
    // T024: US3 — not-approved and payment-not-fundable outcomes
    // ============================================================

    it('should propagate CHANGE_REQUEST_NOT_APPROVED', async () => {
      (service.fundFromPortal as jest.Mock).mockRejectedValue(
        new AppException({ code: ErrorCode.CHANGE_REQUEST_NOT_APPROVED }),
      );
      const dto = { amount: '500.00' };
      await expect(
        controller.fundChangeRequest('test-token', TEST_CR_ID, dto),
      ).rejects.toMatchObject({ code: ErrorCode.CHANGE_REQUEST_NOT_APPROVED });
    });

    it('should propagate PAYMENT_NOT_FUNDABLE', async () => {
      (service.fundFromPortal as jest.Mock).mockRejectedValue(
        new AppException({ code: ErrorCode.PAYMENT_NOT_FUNDABLE }),
      );
      const dto = { amount: '500.00' };
      await expect(
        controller.fundChangeRequest('test-token', TEST_CR_ID, dto),
      ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_FUNDABLE });
    });

    it('should propagate PORTAL_TOKEN_INVALID', async () => {
      (service.fundFromPortal as jest.Mock).mockRejectedValue(
        new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID }),
      );
      const dto = { amount: '500.00' };
      await expect(
        controller.fundChangeRequest('invalid-token', TEST_CR_ID, dto),
      ).rejects.toMatchObject({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    });
  });
});
