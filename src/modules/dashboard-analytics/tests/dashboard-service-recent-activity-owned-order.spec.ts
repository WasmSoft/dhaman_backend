import { TimelineActorRole, TimelineEventType } from '@prisma/client';
import {
  buildMixedStatusesScenario,
  createDashboardService,
} from './dashboard-service-test-helpers';

describe('dashboard recent activity ordering and ownership', () => {
  it('returns owned recent activity newest first', async () => {
    const { service, prisma } = createDashboardService();

    (prisma.timelineEvent.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'event-2',
        agreementId: 'agreement-1',
        type: TimelineEventType.DELIVERY_SUBMITTED,
        title: 'Delivery submitted',
        description: 'Submitted for review',
        actorRole: TimelineActorRole.FREELANCER,
        metadata: { milestoneId: 'milestone-1' },
        createdAt: new Date('2026-04-29T10:30:00.000Z'),
        agreement: { title: 'Landing page redesign' },
      },
      {
        id: 'event-1',
        agreementId: 'agreement-1',
        type: TimelineEventType.AGREEMENT_CREATED,
        title: 'Agreement created',
        description: 'Created by freelancer',
        actorRole: TimelineActorRole.FREELANCER,
        metadata: null,
        createdAt: new Date('2026-04-29T09:30:00.000Z'),
        agreement: { title: 'Landing page redesign' },
      },
    ]);

    const result = await service.getRecentActivity({ limit: 10 });

    expect(result.items.map((item) => item.id)).toEqual(['event-2', 'event-1']);
    expect(prisma.timelineEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          agreement: { freelancerId: 'freelancer-1' },
        }),
      }),
    );
  });

  it('asserts most-recent-first ordering and that limit is respected against the mixed-statuses fixture (FR-005)', async () => {
    const { service, prisma } = createDashboardService();
    const fixture = buildMixedStatusesScenario();

    const sortedEvents = [...fixture.timelineEvents].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue({
      id: fixture.agreements[0].id,
    });
    (prisma.timelineEvent.findMany as jest.Mock).mockImplementation(
      ({ take }: { take?: number }) => {
        const limited = take ? sortedEvents.slice(0, take) : sortedEvents;
        return Promise.resolve(
          limited.map((e) => ({
            id: e.id,
            agreementId: e.agreementId,
            type: e.type,
            title: e.title,
            description: e.description,
            actorRole: e.actorRole,
            metadata: e.metadata ?? null,
            createdAt: e.createdAt,
            agreement: { title: 'Test Agreement' },
          })),
        );
      },
    );

    const result = await service.getRecentActivity({ limit: 5 });

    expect(result.items.length).toBeLessThanOrEqual(5);

    for (let i = 0; i < result.items.length - 1; i++) {
      const current = new Date(result.items[i].createdAt).getTime();
      const next = new Date(result.items[i + 1].createdAt).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });
});
