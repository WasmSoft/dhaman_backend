import { TimelineActorRole, TimelineEventType } from '@prisma/client';
import { ClsService } from '../../common/cls/cls.service';
import { ActorType } from '../../common/enums/actor-type.enum';
import { Locale } from '../../common/enums/locale.enum';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { TimelineEventsService } from '../../modules/timeline-events/timeline-events.service';

describe('TimelineEventsService createEvent', () => {
  it('persists actor and request context metadata inside the provided transaction', async () => {
    const clsService = new ClsService();
    const tx = {
      timelineEvent: {
        create: jest.fn().mockResolvedValue({ id: 'event-1' }),
      },
    };
    const service = new TimelineEventsService(
      {
        timelineEvent: { create: jest.fn() },
      } as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-1',
        locale: Locale.AR,
        requestId: 'req-1',
        startedAt: new Date('2026-04-29T00:00:00.000Z'),
        userId: 'user-1',
      },
      () =>
        service.createEvent(
          {
            actorRole: TimelineActorRole.FREELANCER,
            agreementId: 'agreement-1',
            description: 'Milestone updated.',
            metadata: { changedFields: ['title'] },
            milestoneId: 'milestone-1',
            title: 'Milestone updated',
            type: TimelineEventType.MILESTONE_UPDATED,
          },
          tx as unknown as Parameters<TimelineEventsService['createEvent']>[1],
        ),
    );

    expect(tx.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'user-1',
        actorRole: TimelineActorRole.FREELANCER,
        agreementId: 'agreement-1',
        metadata: expect.objectContaining({
          actorId: 'user-1',
          actorRole: TimelineActorRole.FREELANCER,
          agreementId: 'agreement-1',
          changedFields: ['title'],
          correlationId: 'corr-1',
          milestoneId: 'milestone-1',
          requestId: 'req-1',
        }) as unknown,
        milestoneId: 'milestone-1',
        type: TimelineEventType.MILESTONE_UPDATED,
      }) as unknown,
    });
  });

  it('falls back to the root PrismaService when no transaction client is supplied', async () => {
    const clsService = new ClsService();
    const prisma = {
      timelineEvent: {
        create: jest.fn().mockResolvedValue({ id: 'event-2' }),
      },
    };
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-2',
        locale: Locale.AR,
        requestId: 'req-2',
        startedAt: new Date('2026-04-29T00:00:00.000Z'),
        userId: 'user-2',
      },
      () =>
        service.createEvent({
          actorRole: TimelineActorRole.FREELANCER,
          agreementId: 'agreement-2',
          description: 'Milestone created.',
          metadata: { nullableValue: undefined, title: 'Milestone' },
          milestoneId: 'milestone-2',
          title: 'Milestone created',
          type: TimelineEventType.MILESTONE_CREATED,
        }),
    );

    expect(prisma.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'user-2',
        agreementId: 'agreement-2',
        metadata: expect.objectContaining({
          actorId: 'user-2',
          correlationId: 'corr-2',
          requestId: 'req-2',
          title: 'Milestone',
        }) as unknown,
      }) as unknown,
    });
    const [firstCall] = prisma.timelineEvent.create.mock.calls as Array<
      [{ data: { metadata: Record<string, unknown> } }]
    >;

    expect(firstCall[0].data.metadata.nullableValue).toBeUndefined();
  });

  it('uses the explicit actorId when provided', async () => {
    const clsService = new ClsService();
    const tx = {
      timelineEvent: {
        create: jest.fn().mockResolvedValue({ id: 'event-3' }),
      },
    };
    const service = new TimelineEventsService(
      {
        timelineEvent: { create: jest.fn() },
      } as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-3',
        locale: Locale.AR,
        requestId: 'req-3',
        startedAt: new Date('2026-04-29T00:00:00.000Z'),
        userId: 'cls-user',
      },
      () =>
        service.createEvent(
          {
            actorId: 'explicit-user',
            actorRole: TimelineActorRole.FREELANCER,
            agreementId: 'agreement-3',
            description: 'Milestone deleted.',
            milestoneId: 'milestone-3',
            title: 'Milestone deleted',
            type: TimelineEventType.MILESTONE_DELETED,
          },
          tx as unknown as Parameters<TimelineEventsService['createEvent']>[1],
        ),
    );

    expect(tx.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'explicit-user',
        metadata: expect.objectContaining({
          actorId: 'explicit-user',
        }) as unknown,
      }) as unknown,
    });
  });

  it('merges context fields into metadata without removing payment-specific fields', async () => {
    const clsService = new ClsService();
    const tx = {
      timelineEvent: {
        create: jest.fn().mockResolvedValue({ id: 'event-4' }),
      },
    };
    const service = new TimelineEventsService(
      {
        timelineEvent: { create: jest.fn() },
      } as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-4',
        locale: Locale.AR,
        requestId: 'req-4',
        startedAt: new Date('2026-04-29T00:00:00.000Z'),
        userId: 'user-4',
      },
      () =>
        service.createEvent(
          {
            actorId: 'user-4',
            actorRole: TimelineActorRole.FREELANCER,
            agreementId: 'agreement-4',
            description: 'Payment funded.',
            milestoneId: 'milestone-4',
            title: 'Payment Reserved',
            type: TimelineEventType.PAYMENT_RESERVED,
            metadata: {
              paymentId: 'payment-1',
              previousStatus: 'WAITING',
              newStatus: 'RESERVED',
              receiptNumber: 'DHM-20260429-ABC123',
              transactionReference: 'TXN-abcdefghijklmnopqrstuvwx',
            },
          },
          tx as unknown as Parameters<TimelineEventsService['createEvent']>[1],
        ),
    );

    expect(tx.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'user-4',
        actorRole: TimelineActorRole.FREELANCER,
        agreementId: 'agreement-4',
        milestoneId: 'milestone-4',
        type: TimelineEventType.PAYMENT_RESERVED,
        metadata: expect.objectContaining({
          paymentId: 'payment-1',
          previousStatus: 'WAITING',
          newStatus: 'RESERVED',
          receiptNumber: 'DHM-20260429-ABC123',
          transactionReference: 'TXN-abcdefghijklmnopqrstuvwx',
          actorId: 'user-4',
          actorRole: TimelineActorRole.FREELANCER,
          agreementId: 'agreement-4',
          correlationId: 'corr-4',
          requestId: 'req-4',
          milestoneId: 'milestone-4',
        }) as unknown,
      }) as unknown,
    });
  });

  it('merges releasedAt and notes from payment metadata without dropping them', async () => {
    const clsService = new ClsService();
    const tx = {
      timelineEvent: {
        create: jest.fn().mockResolvedValue({ id: 'event-5' }),
      },
    };
    const service = new TimelineEventsService(
      {
        timelineEvent: { create: jest.fn() },
      } as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-5',
        locale: Locale.AR,
        requestId: 'req-5',
        startedAt: new Date('2026-04-29T00:00:00.000Z'),
        userId: 'user-5',
      },
      () =>
        service.createEvent(
          {
            actorId: 'user-5',
            actorRole: TimelineActorRole.FREELANCER,
            agreementId: 'agreement-5',
            description: 'Payment released.',
            milestoneId: 'milestone-5',
            title: 'Payment Released',
            type: TimelineEventType.PAYMENT_RELEASED,
            metadata: {
              paymentId: 'payment-1',
              previousStatus: 'READY_TO_RELEASE',
              newStatus: 'RELEASED',
              releasedAt: '2026-04-29T00:00:00.000Z',
              notes: 'Client approved',
            },
          },
          tx as unknown as Parameters<TimelineEventsService['createEvent']>[1],
        ),
    );

    expect(tx.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'user-5',
        actorRole: TimelineActorRole.FREELANCER,
        agreementId: 'agreement-5',
        milestoneId: 'milestone-5',
        type: TimelineEventType.PAYMENT_RELEASED,
        metadata: expect.objectContaining({
          paymentId: 'payment-1',
          previousStatus: 'READY_TO_RELEASE',
          newStatus: 'RELEASED',
          releasedAt: '2026-04-29T00:00:00.000Z',
          notes: 'Client approved',
          actorId: 'user-5',
          actorRole: TimelineActorRole.FREELANCER,
          agreementId: 'agreement-5',
          correlationId: 'corr-5',
          requestId: 'req-5',
          milestoneId: 'milestone-5',
        }) as unknown,
      }) as unknown,
    });
  });
});
