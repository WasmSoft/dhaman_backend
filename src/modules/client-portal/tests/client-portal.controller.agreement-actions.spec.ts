import { ErrorCode } from '../../../common/enums/error-code.enum';
import { AppException } from '../../../common/errors/app-exception';
import { createTestModule } from './client-portal.controller.test-utils';
import { VALID_TOKEN } from './client-portal.controller.fixtures';
import type { ClientPortalService } from '../client-portal.service';
import type { ClientPortalController } from '../client-portal.controller';

describe('ClientPortalController — agreement actions (US2)', () => {
  let controller: ClientPortalController;
  let serviceMock: ReturnType<typeof jest.mocked<ClientPortalService>>;

  beforeEach(async () => {
    const result = await createTestModule();
    controller = result.controller;
    serviceMock = result.serviceMock as any;
  });

  describe('approve', () => {
    it('should delegate to ClientPortalService.approve with token', async () => {
      const mockResponse = {
        agreementId: '223e4567-e89b-12d3-a456-426614174000',
        status: 'APPROVED',
        message: 'Agreement approved successfully.',
      };

      serviceMock.approve.mockResolvedValue(mockResponse);

      const result = await controller.approve(VALID_TOKEN);

      expect(serviceMock.approve).toHaveBeenCalledWith(VALID_TOKEN);
      expect(result).toEqual(mockResponse);
    });

    it('should propagate AGREEMENT_NOT_APPROVABLE from service', async () => {
      serviceMock.approve.mockRejectedValue(
        new AppException({ code: ErrorCode.AGREEMENT_NOT_APPROVABLE }),
      );

      await expect(controller.approve(VALID_TOKEN)).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_APPROVABLE,
      });
    });
  });

  describe('requestChanges', () => {
    it('should delegate to ClientPortalService.requestChanges with token and dto', async () => {
      const dto = {
        reason: 'The milestones need adjustment for the timeline.',
        requestedChanges: ['Milestone order'],
      };
      const mockResponse = {
        agreementId: '223e4567-e89b-12d3-a456-426614174000',
        status: 'CHANGE_REQUESTED',
        message: 'Agreement changes requested successfully.',
      };

      serviceMock.requestChanges.mockResolvedValue(mockResponse);

      const result = await controller.requestChanges(VALID_TOKEN, dto);

      expect(serviceMock.requestChanges).toHaveBeenCalledWith(VALID_TOKEN, dto);
      expect(result).toEqual(mockResponse);
    });

    it('should propagate AGREEMENT_NOT_CHANGEABLE from service', async () => {
      const dto = { reason: 'The milestones need adjustment for the timeline.' };
      serviceMock.requestChanges.mockRejectedValue(
        new AppException({ code: ErrorCode.AGREEMENT_NOT_CHANGEABLE }),
      );

      await expect(
        controller.requestChanges(VALID_TOKEN, dto),
      ).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_CHANGEABLE,
      });
    });

    it('should propagate VALIDATION_ERROR from service (invalid DTO)', async () => {
      const dto = { reason: 'short' };
      serviceMock.requestChanges.mockRejectedValue(
        new AppException({ code: ErrorCode.VALIDATION_ERROR }),
      );

      await expect(
        controller.requestChanges(VALID_TOKEN, dto),
      ).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
      });
    });

    it('should not call other service methods when requestChanges fails', async () => {
      const dto = { reason: 'The milestones need adjustment for the timeline.' };
      serviceMock.requestChanges.mockRejectedValue(
        new AppException({ code: ErrorCode.AGREEMENT_NOT_CHANGEABLE }),
      );

      await expect(
        controller.requestChanges(VALID_TOKEN, dto),
      ).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_CHANGEABLE,
      });

      // Verify no other service methods were called
      expect(serviceMock.approve).not.toHaveBeenCalled();
      expect(serviceMock.rejectAgreement).not.toHaveBeenCalled();
      expect(serviceMock.getPortal).not.toHaveBeenCalled();
    });
  });

  describe('rejectAgreement', () => {
    it('should delegate to ClientPortalService.rejectAgreement with token and dto', async () => {
      const dto = { reason: 'Budget does not match our current requirements.' };
      const mockResponse = {
        agreementId: '223e4567-e89b-12d3-a456-426614174000',
        status: 'CANCELLED',
        message: 'Agreement rejected.',
      };

      serviceMock.rejectAgreement.mockResolvedValue(mockResponse);

      const result = await controller.rejectAgreement(VALID_TOKEN, dto);

      expect(serviceMock.rejectAgreement).toHaveBeenCalledWith(VALID_TOKEN, dto);
      expect(result).toEqual(mockResponse);
    });

    it('should propagate AGREEMENT_NOT_REJECTABLE from service', async () => {
      const dto = { reason: 'Budget does not match our current requirements.' };
      serviceMock.rejectAgreement.mockRejectedValue(
        new AppException({ code: ErrorCode.AGREEMENT_NOT_REJECTABLE }),
      );

      await expect(
        controller.rejectAgreement(VALID_TOKEN, dto),
      ).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_REJECTABLE,
      });
    });

    it('should propagate VALIDATION_ERROR from service (invalid DTO)', async () => {
      const dto = { reason: 'short' };
      serviceMock.rejectAgreement.mockRejectedValue(
        new AppException({ code: ErrorCode.VALIDATION_ERROR }),
      );

      await expect(
        controller.rejectAgreement(VALID_TOKEN, dto),
      ).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
      });
    });

    it('should not call other service methods when rejectAgreement fails', async () => {
      const dto = { reason: 'Budget does not match our current requirements.' };
      serviceMock.rejectAgreement.mockRejectedValue(
        new AppException({ code: ErrorCode.AGREEMENT_NOT_REJECTABLE }),
      );

      await expect(
        controller.rejectAgreement(VALID_TOKEN, dto),
      ).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_REJECTABLE,
      });

      expect(serviceMock.approve).not.toHaveBeenCalled();
      expect(serviceMock.requestChanges).not.toHaveBeenCalled();
      expect(serviceMock.getPortal).not.toHaveBeenCalled();
    });
  });
});
