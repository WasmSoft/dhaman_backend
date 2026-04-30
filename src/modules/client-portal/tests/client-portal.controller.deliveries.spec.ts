import { ErrorCode } from '../../../common/enums/error-code.enum';
import { AppException } from '../../../common/errors/app-exception';
import { createTestModule } from './client-portal.controller.test-utils';
import {
  VALID_TOKEN,
  DELIVERY_UUID,
  DELIVERY_A_UUID,
  DELIVERY_B_UUID,
  AGREEMENT_A_UUID,
  AGREEMENT_B_UUID,
} from './client-portal.controller.fixtures';
import type { ClientPortalService } from '../client-portal.service';
import type { ClientPortalController } from '../client-portal.controller';

describe('ClientPortalController — deliveries (US4)', () => {
  let controller: ClientPortalController;
  let serviceMock: ReturnType<typeof jest.mocked<ClientPortalService>>;

  beforeEach(async () => {
    const result = await createTestModule();
    controller = result.controller;
    serviceMock = result.serviceMock as any;
  });

  describe('getDelivery', () => {
    it('should delegate to ClientPortalService.getDelivery with token and deliveryId', async () => {
      const mockResponse = {
        id: DELIVERY_UUID,
        milestoneId: 'm1',
        milestoneTitle: 'Logo Design',
        status: 'SUBMITTED',
        submittedAt: '2026-02-15T00:00:00.000Z',
        notes: undefined,
      };

      serviceMock.getDelivery.mockResolvedValue(mockResponse);

      const result = await controller.getDelivery(VALID_TOKEN, DELIVERY_UUID);

      expect(serviceMock.getDelivery).toHaveBeenCalledWith(
        VALID_TOKEN,
        DELIVERY_UUID,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should propagate DELIVERY_NOT_FOUND from service', async () => {
      serviceMock.getDelivery.mockRejectedValue(
        new AppException({ code: ErrorCode.DELIVERY_NOT_FOUND }),
      );

      await expect(
        controller.getDelivery(VALID_TOKEN, DELIVERY_UUID),
      ).rejects.toMatchObject({
        code: ErrorCode.DELIVERY_NOT_FOUND,
      });
    });

    it('should return not-found for cross-agreement delivery (B accessed with token A)', async () => {
      serviceMock.getDelivery.mockRejectedValue(
        new AppException({ code: ErrorCode.DELIVERY_NOT_FOUND }),
      );

      await expect(
        controller.getDelivery(VALID_TOKEN, DELIVERY_B_UUID),
      ).rejects.toMatchObject({
        code: ErrorCode.DELIVERY_NOT_FOUND,
      });
    });
  });

  describe('acceptDelivery', () => {
    it('should delegate to ClientPortalService.acceptDelivery with token and deliveryId', async () => {
      const mockResponse = {
        agreementId: '223e4567-e89b-12d3-a456-426614174000',
        status: 'ACCEPTED',
        message: 'Delivery accepted.',
      };

      serviceMock.acceptDelivery.mockResolvedValue(mockResponse);

      const result = await controller.acceptDelivery(
        VALID_TOKEN,
        DELIVERY_UUID,
      );

      expect(serviceMock.acceptDelivery).toHaveBeenCalledWith(
        VALID_TOKEN,
        DELIVERY_UUID,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should propagate DELIVERY_NOT_FOUND from service (cross-agreement masking)', async () => {
      serviceMock.acceptDelivery.mockRejectedValue(
        new AppException({ code: ErrorCode.DELIVERY_NOT_FOUND }),
      );

      await expect(
        controller.acceptDelivery(VALID_TOKEN, DELIVERY_UUID),
      ).rejects.toMatchObject({
        code: ErrorCode.DELIVERY_NOT_FOUND,
      });
    });

    it('should propagate DELIVERY_NOT_REVIEWABLE from service', async () => {
      serviceMock.acceptDelivery.mockRejectedValue(
        new AppException({ code: ErrorCode.DELIVERY_NOT_REVIEWABLE }),
      );

      await expect(
        controller.acceptDelivery(VALID_TOKEN, DELIVERY_UUID),
      ).rejects.toMatchObject({
        code: ErrorCode.DELIVERY_NOT_REVIEWABLE,
      });
    });

    it('should reject cross-agreement delivery accept (B accessed with token A)', async () => {
      serviceMock.acceptDelivery.mockRejectedValue(
        new AppException({ code: ErrorCode.DELIVERY_NOT_FOUND }),
      );

      await expect(
        controller.acceptDelivery(VALID_TOKEN, DELIVERY_B_UUID),
      ).rejects.toMatchObject({
        code: ErrorCode.DELIVERY_NOT_FOUND,
      });
    });
  });

  describe('requestDeliveryChanges', () => {
    it('should delegate to ClientPortalService.requestDeliveryChanges with token, deliveryId, and dto', async () => {
      const dto = {
        reason: 'Navigation overlaps header on mobile.',
        requestedChanges: ['Mobile navigation'],
      };
      const mockResponse = {
        agreementId: '223e4567-e89b-12d3-a456-426614174000',
        status: 'CHANGES_REQUESTED',
        message: 'Delivery changes requested.',
      };

      serviceMock.requestDeliveryChanges.mockResolvedValue(mockResponse);

      const result = await controller.requestDeliveryChanges(
        VALID_TOKEN,
        DELIVERY_UUID,
        dto,
      );

      expect(serviceMock.requestDeliveryChanges).toHaveBeenCalledWith(
        VALID_TOKEN,
        DELIVERY_UUID,
        dto,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should propagate DELIVERY_NOT_FOUND from service', async () => {
      const dto = { reason: 'Navigation overlaps header on mobile.' };
      serviceMock.requestDeliveryChanges.mockRejectedValue(
        new AppException({ code: ErrorCode.DELIVERY_NOT_FOUND }),
      );

      await expect(
        controller.requestDeliveryChanges(VALID_TOKEN, DELIVERY_UUID, dto),
      ).rejects.toMatchObject({
        code: ErrorCode.DELIVERY_NOT_FOUND,
      });
    });

    it('should reject cross-agreement delivery change request (B accessed with token A)', async () => {
      const dto = { reason: 'Needs revision.' };
      serviceMock.requestDeliveryChanges.mockRejectedValue(
        new AppException({ code: ErrorCode.DELIVERY_NOT_FOUND }),
      );

      await expect(
        controller.requestDeliveryChanges(VALID_TOKEN, DELIVERY_B_UUID, dto),
      ).rejects.toMatchObject({
        code: ErrorCode.DELIVERY_NOT_FOUND,
      });
    });
  });
});
