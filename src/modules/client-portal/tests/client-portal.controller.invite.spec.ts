import { ErrorCode } from '../../../common/enums/error-code.enum';
import { AppException } from '../../../common/errors/app-exception';
import { createTestModule } from './client-portal.controller.test-utils';
import {
  VALID_TOKEN,
  INVALID_TOKEN,
} from './client-portal.controller.fixtures';
import type { ClientPortalService } from '../client-portal.service';
import type { ClientPortalController } from '../client-portal.controller';

describe('ClientPortalController — invite (US1)', () => {
  let controller: ClientPortalController;
  let serviceMock: ReturnType<typeof jest.mocked<ClientPortalService>>;

  beforeEach(async () => {
    const result = await createTestModule();
    controller = result.controller;
    serviceMock = result.serviceMock as any;
  });

  describe('getInvite', () => {
    it('should delegate to ClientPortalService.getInvite with token', async () => {
      const mockResponse = {
        agreementId: '223e4567-e89b-12d3-a456-426614174000',
        title: 'Test Agreement',
        description: 'Test description',
        serviceType: 'Design',
        totalAmount: '5000.00',
        currency: 'SAR',
        status: 'SENT',
        freelancer: { name: 'Ahmed' },
        client: { name: 'Sara' },
        milestones: [],
        paymentSchedule: [],
      };

      serviceMock.getInvite.mockResolvedValue(mockResponse);

      const result = await controller.getInvite(VALID_TOKEN);

      expect(serviceMock.getInvite).toHaveBeenCalledWith(VALID_TOKEN);
      expect(result).toEqual(mockResponse);
    });

    it('should propagate AGREEMENT_NOT_FOUND from service', async () => {
      serviceMock.getInvite.mockRejectedValue(
        new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND }),
      );

      await expect(controller.getInvite(INVALID_TOKEN)).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_FOUND,
      });
    });

    it('should propagate PORTAL_TOKEN_INVALID from service', async () => {
      serviceMock.getInvite.mockRejectedValue(
        new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID }),
      );

      await expect(controller.getInvite(INVALID_TOKEN)).rejects.toMatchObject({
        code: ErrorCode.PORTAL_TOKEN_INVALID,
      });
    });
  });
});
