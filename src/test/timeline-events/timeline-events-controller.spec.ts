import { TimelineActorRole, TimelineEventType } from '@prisma/client';
import { TimelineEventsController } from '../../modules/timeline-events/timeline-events.controller';
import { TimelineEventsService } from '../../modules/timeline-events/timeline-events.service';
import { TimelineQueryDto } from '../../modules/timeline-events/dto/timeline-events.dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';

// AR: يتحقق من أن نقاط نهاية وحدة التحكم تفوض بشكل صحيح إلى الخدمة.
// EN: Verifies that controller endpoints delegate correctly to the service.
describe('TimelineEventsController', () => {
  let controller: TimelineEventsController;
  let service: {
    listByAgreementId: jest.Mock;
    listByPortalToken: jest.Mock;
  };

  beforeEach(() => {
    service = {
      listByAgreementId: jest.fn(),
      listByPortalToken: jest.fn(),
    };

    controller = new TimelineEventsController(
      service as unknown as TimelineEventsService,
    );
  });

  describe('listByAgreementId (GET /agreements/:agreementId/timeline)', () => {
    it('delegates to TimelineEventsService.listByAgreementId with server-owned user identity', async () => {
      const agreementId = 'a1b2c3d4-e5f6-4890-9234-567890abcdef';
      const query: TimelineQueryDto = {};
      const user: AuthenticatedUser = {
        id: 'user-1',
        email: 'freelancer@example.com',
      } as AuthenticatedUser;

      const mockResult = { items: [], page: 1, limit: 20, total: 0, hasNextPage: false };
      service.listByAgreementId.mockResolvedValue(mockResult);

      const result = await controller.listByAgreementId(agreementId, query, user);

      expect(service.listByAgreementId).toHaveBeenCalledWith(agreementId, query, user.id);
      expect(result).toBe(mockResult);
    });

    it('passes all query parameters through to service', async () => {
      const agreementId = 'a1b2c3d4-e5f6-4890-9234-567890abcdef';
      const query: TimelineQueryDto = {
        type: TimelineEventType.PAYMENT_RESERVED,
        milestoneId: 'm1-c2d3-e4f5-6789-0abc-def012345678',
        actorRole: TimelineActorRole.CLIENT,
        from: '2026-04-01T00:00:00.000Z',
        to: '2026-04-30T23:59:59.999Z',
        page: 2,
        limit: 10,
      };
      const user: AuthenticatedUser = {
        id: 'user-2',
        email: 'freelancer2@example.com',
      } as AuthenticatedUser;

      const mockResult = { items: [], page: 2, limit: 10, total: 0, hasNextPage: false };
      service.listByAgreementId.mockResolvedValue(mockResult);

      await controller.listByAgreementId(agreementId, query, user);

      expect(service.listByAgreementId).toHaveBeenCalledWith(agreementId, query, user.id);
    });
  });

  describe('listByPortalToken (GET /portal/:token/timeline)', () => {
    it('delegates to TimelineEventsService.listByPortalToken with raw token', async () => {
      const rawToken = 'portal-token-abc123';
      const query: TimelineQueryDto = {};

      const mockResult = { items: [], page: 1, limit: 20, total: 0, hasNextPage: false };
      service.listByPortalToken.mockResolvedValue(mockResult);

      const result = await controller.listByPortalToken(rawToken, query);

      expect(service.listByPortalToken).toHaveBeenCalledWith(rawToken, query);
      expect(result).toBe(mockResult);
    });

    it('passes query parameters through to portal token service', async () => {
      const rawToken = 'portal-token-xyz789';
      const query: TimelineQueryDto = {
        type: TimelineEventType.DELIVERY_SUBMITTED,
        page: 1,
        limit: 50,
      };

      const mockResult = { items: [], page: 1, limit: 50, total: 0, hasNextPage: false };
      service.listByPortalToken.mockResolvedValue(mockResult);

      await controller.listByPortalToken(rawToken, query);

      expect(service.listByPortalToken).toHaveBeenCalledWith(rawToken, query);
    });
  });

  describe('identity delegation', () => {
    it('passes server-owned user.id from the CurrentUser decorator, not a client-supplied identity', async () => {
      const agreementId = 'a1b2c3d4-e5f6-4890-9234-567890abcdef';
      const query: TimelineQueryDto = { page: 1, limit: 5 };
      const user: AuthenticatedUser = {
        id: 'server-asserted-user-id',
        email: 'real@example.com',
      } as AuthenticatedUser;

      service.listByAgreementId.mockResolvedValue({
        items: [],
        page: 1,
        limit: 5,
        total: 0,
        hasNextPage: false,
      });

      await controller.listByAgreementId(agreementId, query, user);

      expect(service.listByAgreementId).toHaveBeenCalledWith(
        agreementId,
        query,
        'server-asserted-user-id',
      );
    });
  });
});
