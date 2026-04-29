import { TimelineActorRole, TimelineEventType } from '@prisma/client';
import { AppException } from '../../../common/errors/app-exception';
import {
  createDashboardClsMock,
  createDashboardService,
} from './dashboard-service-test-helpers';

describe('dashboard recent activity type, limit, and metadata', () => {
  it('passes type and limit to the owned timeline query and returns metadata', async () => {
    const { service, prisma } = createDashboardService();

    (prisma.timelineEvent.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'event-1',
        agreementId: 'agreement-1',
        type: TimelineEventType.DELIVERY_SUBMITTED,
        title: 'Delivery submitted',
        description: 'Submitted for review',
        actorRole: TimelineActorRole.FREELANCER,
        metadata: { deliveryId: 'delivery-1' },
        createdAt: new Date('2026-04-29T10:30:00.000Z'),
        agreement: { title: 'Landing page redesign' },
      },
    ]);

    const result = await service.getRecentActivity({
      type: TimelineEventType.DELIVERY_SUBMITTED,
      limit: 1,
    });

    expect(prisma.timelineEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: TimelineEventType.DELIVERY_SUBMITTED,
        }),
        take: 1,
      }),
    );
    expect(result.items[0].metadata).toEqual({ deliveryId: 'delivery-1' });
  });

  it('rejects recent activity access when the request context has no freelancer user id', async () => {
    const { service } = createDashboardService({
      cls: createDashboardClsMock({ userId: undefined }),
    });

    await expect(
      service.getRecentActivity({ limit: 10 }),
    ).rejects.toMatchObject<Partial<AppException>>({ code: 'UNAUTHORIZED' });
  });

  it('asserts each TimelineEventType filter and the [1, 50] limit boundary (FR-005)', async () => {
    const { service, prisma } = createDashboardService();

    (prisma.timelineEvent.findMany as jest.Mock).mockResolvedValue([]);

    const eventTypes = Object.values(TimelineEventType);

    for (const type of eventTypes) {
      await service.getRecentActivity({ type, limit: 10 });

      expect(prisma.timelineEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type }),
        }),
      );
    }

    await expect(service.getRecentActivity({ limit: 0 })).rejects.toMatchObject<
      Partial<AppException>
    >({ code: 'VALIDATION_ERROR' });

    await expect(
      service.getRecentActivity({ limit: 51 }),
    ).rejects.toMatchObject<Partial<AppException>>({
      code: 'VALIDATION_ERROR',
    });

    const withLimit1 = await service.getRecentActivity({ limit: 1 });
    expect(withLimit1.items.length).toBeLessThanOrEqual(1);

    const withLimit50 = await service.getRecentActivity({ limit: 50 });
    expect(withLimit50.items.length).toBeLessThanOrEqual(50);
  });
});
