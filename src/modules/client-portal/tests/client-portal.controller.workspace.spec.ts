import { ErrorCode } from '../../../common/enums/error-code.enum';
import { AppException } from '../../../common/errors/app-exception';
import { createTestModule } from './client-portal.controller.test-utils';
import { VALID_TOKEN } from './client-portal.controller.fixtures';
import type { ClientPortalService } from '../client-portal.service';
import type { ClientPortalController } from '../client-portal.controller';

describe('ClientPortalController — workspace (US3)', () => {
  let controller: ClientPortalController;
  let serviceMock: ReturnType<typeof jest.mocked<ClientPortalService>>;

  beforeEach(async () => {
    const result = await createTestModule();
    controller = result.controller;
    serviceMock = result.serviceMock as any;
  });

  describe('getPortal', () => {
    it('should delegate to ClientPortalService.getPortal with token', async () => {
      const mockResponse = {
        agreementId: '223e4567-e89b-12d3-a456-426614174000',
        title: 'Brand Identity',
        status: 'APPROVED',
        totalAmount: '5000.00',
        currency: 'SAR',
        freelancerName: 'Ahmed',
        milestones: [],
        payments: [],
        deliveries: [],
        changeRequests: [],
        aiReviews: [],
        timeline: [],
      };

      serviceMock.getPortal.mockResolvedValue(mockResponse);

      const result = await controller.getPortal(VALID_TOKEN);

      expect(serviceMock.getPortal).toHaveBeenCalledWith(VALID_TOKEN);
      expect(result).toEqual(mockResponse);
    });

    it('should return workspace with all sub-resources', async () => {
      const mockResponse = {
        agreementId: '223e4567-e89b-12d3-a456-426614174000',
        title: 'Full Agreement',
        status: 'APPROVED',
        totalAmount: '10000.00',
        currency: 'SAR',
        freelancerName: 'Ahmed',
        milestones: [
          {
            id: 'm1',
            order: 1,
            title: 'Phase 1',
            description: undefined,
            amount: '5000.00',
            currency: 'SAR',
            status: 'COMPLETED',
            dueDate: '2026-02-01T00:00:00.000Z',
          },
        ],
        payments: [
          {
            milestoneId: 'm1',
            milestoneTitle: 'Phase 1',
            amount: '5000.00',
            currency: 'SAR',
            status: 'RELEASED',
          },
        ],
        deliveries: [
          {
            id: 'd1',
            milestoneId: 'm1',
            milestoneTitle: 'Phase 1',
            status: 'ACCEPTED',
            submittedAt: '2026-02-01T00:00:00.000Z',
            notes: undefined,
          },
        ],
        changeRequests: [
          {
            id: 'cr1',
            title: 'Extra page',
            description: 'Need more',
            requestedAmount: '1000.00',
            status: 'DRAFT',
            createdAt: '2026-01-15T00:00:00.000Z',
          },
        ],
        aiReviews: [
          {
            id: 'ai1',
            status: 'COMPLETED',
            conclusion: 'Fair delivery',
            createdAt: '2026-02-10T00:00:00.000Z',
          },
        ],
        timeline: [
          {
            id: 't1',
            eventType: 'AGREEMENT_APPROVED',
            actorRole: 'CLIENT',
            description: 'Approved',
            occurredAt: '2026-01-15T00:00:00.000Z',
          },
        ],
      };

      serviceMock.getPortal.mockResolvedValue(mockResponse);

      const result = await controller.getPortal(VALID_TOKEN);

      expect(result).toHaveProperty('milestones');
      expect(result).toHaveProperty('payments');
      expect(result).toHaveProperty('deliveries');
      expect(result).toHaveProperty('changeRequests');
      expect(result).toHaveProperty('aiReviews');
      expect(result).toHaveProperty('timeline');
    });

    it('should return empty arrays when no sub-resources exist', async () => {
      const mockResponse = {
        agreementId: '223e4567-e89b-12d3-a456-426614174000',
        title: 'Empty Agreement',
        status: 'SENT',
        totalAmount: '1000.00',
        currency: 'SAR',
        freelancerName: 'Ahmed',
        milestones: [],
        payments: [],
        deliveries: [],
        changeRequests: [],
        aiReviews: [],
        timeline: [],
      };

      serviceMock.getPortal.mockResolvedValue(mockResponse);

      const result = await controller.getPortal(VALID_TOKEN);

      expect(result.milestones).toEqual([]);
      expect(result.payments).toEqual([]);
      expect(result.deliveries).toEqual([]);
      expect(result.changeRequests).toEqual([]);
      expect(result.aiReviews).toEqual([]);
      expect(result.timeline).toEqual([]);
    });

    it('should propagate PORTAL_TOKEN_INVALID from service', async () => {
      serviceMock.getPortal.mockRejectedValue(
        new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID }),
      );

      await expect(controller.getPortal(VALID_TOKEN)).rejects.toMatchObject({
        code: ErrorCode.PORTAL_TOKEN_INVALID,
      });
    });
  });
});
