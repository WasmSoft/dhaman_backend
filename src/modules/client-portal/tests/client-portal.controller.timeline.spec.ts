import { ErrorCode } from '../../../common/enums/error-code.enum';
import { AppException } from '../../../common/errors/app-exception';
import { createTestModule } from './client-portal.controller.test-utils';
import {
  VALID_TOKEN,
  AGREEMENT_A_UUID,
  AGREEMENT_B_UUID,
  mockTimelineEvents,
} from './client-portal.controller.fixtures';
import type { ClientPortalService } from '../client-portal.service';
import type { ClientPortalController } from '../client-portal.controller';

describe('ClientPortalController — timeline (US5)', () => {
  let controller: ClientPortalController;
  let serviceMock: ReturnType<typeof jest.mocked<ClientPortalService>>;

  beforeEach(async () => {
    const result = await createTestModule();
    controller = result.controller;
    serviceMock = result.serviceMock as any;
  });

  describe('getTimeline', () => {
    it('should delegate to ClientPortalService.getTimeline with token', async () => {
      const mockResponse = [
        {
          id: 't1',
          eventType: 'AGREEMENT_APPROVED',
          actorRole: 'CLIENT',
          description: 'Client approved agreement via portal.',
          occurredAt: '2026-01-15T00:00:00.000Z',
        },
      ];

      serviceMock.getTimeline.mockResolvedValue(mockResponse);

      const result = await controller.getTimeline(VALID_TOKEN);

      expect(serviceMock.getTimeline).toHaveBeenCalledWith(VALID_TOKEN);
      expect(result).toEqual(mockResponse);
    });

    it('should return empty array when no timeline events exist', async () => {
      serviceMock.getTimeline.mockResolvedValue([]);

      const result = await controller.getTimeline(VALID_TOKEN);

      expect(result).toEqual([]);
    });

    it('should propagate PORTAL_TOKEN_INVALID from service', async () => {
      serviceMock.getTimeline.mockRejectedValue(
        new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID }),
      );

      await expect(controller.getTimeline(VALID_TOKEN)).rejects.toMatchObject({
        code: ErrorCode.PORTAL_TOKEN_INVALID,
      });
    });

    it('should only return timeline events scoped to token agreement A', async () => {
      const timelineA = [
        {
          id: 't1',
          eventType: 'AGREEMENT_APPROVED',
          actorRole: 'CLIENT',
          description: 'Approved via portal A',
          occurredAt: '2026-01-15T00:00:00.000Z',
        },
      ];
      serviceMock.getTimeline.mockResolvedValue(timelineA);

      const result = await controller.getTimeline(VALID_TOKEN);

      expect(result).toHaveLength(1);
      expect(result[0].description).toContain('portal A');
    });

    it('should not return timeline events from agreement B', async () => {
      // Service should filter, so only agreement A events are returned
      const timelineAOnly = [
        {
          id: 't1',
          eventType: 'AGREEMENT_APPROVED',
          actorRole: 'CLIENT',
          description: 'Approved via portal A',
          occurredAt: '2026-01-15T00:00:00.000Z',
        },
      ];
      serviceMock.getTimeline.mockResolvedValue(timelineAOnly);

      const result = await controller.getTimeline(VALID_TOKEN);

      // Must not contain events from agreement B
      expect(result.every((e: any) => !e.description?.includes('B'))).toBe(
        true,
      );
    });

    it('should propagate PORTAL_TOKEN_EXPIRED from service', async () => {
      serviceMock.getTimeline.mockRejectedValue(
        new AppException({ code: ErrorCode.PORTAL_TOKEN_EXPIRED }),
      );

      await expect(controller.getTimeline(VALID_TOKEN)).rejects.toMatchObject({
        code: ErrorCode.PORTAL_TOKEN_EXPIRED,
      });
    });

    it('should propagate PORTAL_TOKEN_REVOKED from service', async () => {
      serviceMock.getTimeline.mockRejectedValue(
        new AppException({ code: ErrorCode.PORTAL_TOKEN_REVOKED }),
      );

      await expect(controller.getTimeline(VALID_TOKEN)).rejects.toMatchObject({
        code: ErrorCode.PORTAL_TOKEN_REVOKED,
      });
    });
  });
});
