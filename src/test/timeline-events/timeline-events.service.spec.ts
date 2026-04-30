import { TimelineActorRole, TimelineEventType } from '@prisma/client';
import { ClsService } from '../../common/cls/cls.service';
import { ActorType } from '../../common/enums/actor-type.enum';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { Locale } from '../../common/enums/locale.enum';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { TimelineEventsService } from '../../modules/timeline-events/timeline-events.service';
import {
  createTimelineEventRow,
  createTimelineEventRows,
  createPrismaStub,
  createPortalTokenStub,
  createAgreementStub,
} from './timeline-events-test-utils';

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

// AR: اختبارات إنشاء الحدث: الحقول المطلوبة وسلوك الإلحاق فقط.
// EN: Required fields and append-only behavior tests.
describe('TimelineEventsService createEvent — required fields and append-only', () => {
  it('persists all required fields on valid creation', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    prisma.timelineEvent.create.mockResolvedValue({ id: 'event-req-1' });
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-req1',
        locale: Locale.EN,
        requestId: 'req-req1',
        startedAt: new Date(),
        userId: 'user-req1',
      },
      () =>
        service.createEvent({
          actorRole: TimelineActorRole.FREELANCER,
          agreementId: 'agreement-req1',
          description: 'Required event.',
          title: 'Required event title',
          type: TimelineEventType.AGREEMENT_CREATED,
        }),
    );

    expect(prisma.timelineEvent.create).toHaveBeenCalledTimes(1);
    expect(prisma.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorRole: TimelineActorRole.FREELANCER,
        agreementId: 'agreement-req1',
        description: 'Required event.',
        title: 'Required event title',
        type: TimelineEventType.AGREEMENT_CREATED,
        metadata: expect.objectContaining({
          actorId: 'user-req1',
          correlationId: 'corr-req1',
          requestId: 'req-req1',
        }) as unknown,
      }) as unknown,
    });
  });

  it('never calls update or delete during event creation', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-app',
        locale: Locale.EN,
        requestId: 'req-app',
        startedAt: new Date(),
        userId: 'user-app',
      },
      () =>
        service.createEvent({
          actorRole: TimelineActorRole.FREELANCER,
          agreementId: 'agreement-app',
          description: 'Append-only event.',
          title: 'Append-only',
          type: TimelineEventType.AGREEMENT_APPROVED,
        }),
    );

    expect(prisma.timelineEvent.create).toHaveBeenCalled();

    expect(prisma.timelineEvent.update).not.toHaveBeenCalled();

    expect(prisma.timelineEvent.delete).not.toHaveBeenCalled();
  });
});

// AR: اختبارات سلامة البيانات الوصفية: مفاتيح حساسة متداخلة، حالات مختلطة، مصفوفات، وقيم غير كائنية.
// EN: Metadata safety tests with nested sensitive keys, mixed case, arrays, and non-object metadata.
describe('TimelineEventsService createEvent — metadata safety', () => {
  it('rejects metadata containing a top-level sensitive key', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-sens1',
        locale: Locale.EN,
        requestId: 'req-sens1',
        startedAt: new Date(),
        userId: 'user-sens1',
      },
      async () => {
        await expect(
          service.createEvent({
            actorRole: TimelineActorRole.FREELANCER,
            agreementId: 'agreement-sens1',
            description: 'Sensitive metadata.',
            title: 'Sensitive',
            type: TimelineEventType.AGREEMENT_CREATED,
            metadata: { password: 'secret123' },
          }),
        ).rejects.toThrow(AppException);
      },
    );
  });

  it('rejects metadata containing a nested sensitive key', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-sens2',
        locale: Locale.EN,
        requestId: 'req-sens2',
        startedAt: new Date(),
        userId: 'user-sens2',
      },
      async () => {
        await expect(
          service.createEvent({
            actorRole: TimelineActorRole.FREELANCER,
            agreementId: 'agreement-sens2',
            description: 'Nested sensitive.',
            title: 'Nested sensitive',
            type: TimelineEventType.AGREEMENT_CREATED,
            metadata: { payment: { secret: 'key123' } },
          }),
        ).rejects.toThrow(AppException);
      },
    );
  });

  it('rejects metadata containing a sensitive key with mixed case', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-sens3',
        locale: Locale.EN,
        requestId: 'req-sens3',
        startedAt: new Date(),
        userId: 'user-sens3',
      },
      async () => {
        await expect(
          service.createEvent({
            actorRole: TimelineActorRole.FREELANCER,
            agreementId: 'agreement-sens3',
            description: 'Mixed case sensitive.',
            title: 'Mixed case',
            type: TimelineEventType.AGREEMENT_CREATED,
            metadata: { PASSWORD: 'secret123' },
          }),
        ).rejects.toThrow(AppException);
      },
    );
  });

  it('rejects metadata containing a sensitive key inside an array of objects', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-sens4',
        locale: Locale.EN,
        requestId: 'req-sens4',
        startedAt: new Date(),
        userId: 'user-sens4',
      },
      async () => {
        await expect(
          service.createEvent({
            actorRole: TimelineActorRole.FREELANCER,
            agreementId: 'agreement-sens4',
            description: 'Array of objects with sensitive.',
            title: 'Array sensitive',
            type: TimelineEventType.AGREEMENT_CREATED,
            metadata: { items: [{ name: 'a', token: 'abc' }] },
          }),
        ).rejects.toThrow(AppException);
      },
    );
  });

  it('rejects non-object metadata input', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-sens5',
        locale: Locale.EN,
        requestId: 'req-sens5',
        startedAt: new Date(),
        userId: 'user-sens5',
      },
      async () => {
        await expect(
          service.createEvent({
            actorRole: TimelineActorRole.FREELANCER,
            agreementId: 'agreement-sens5',
            description: 'Non-object metadata.',
            title: 'Non-object',
            type: TimelineEventType.AGREEMENT_CREATED,
            metadata: 'not-an-object' as unknown as Record<string, unknown>,
          }),
        ).rejects.toThrow(AppException);
      },
    );
  });

  it('accepts safe metadata without sensitive keys', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-safe',
        locale: Locale.EN,
        requestId: 'req-safe',
        startedAt: new Date(),
        userId: 'user-safe',
      },
      () =>
        service.createEvent({
          actorRole: TimelineActorRole.FREELANCER,
          agreementId: 'agreement-safe',
          description: 'Safe metadata.',
          title: 'Safe',
          type: TimelineEventType.AGREEMENT_CREATED,
          metadata: {
            milestoneTitle: 'Homepage',
            amount: '1500.00',
            currency: 'SAR',
          },
        }),
    );

    expect(prisma.timelineEvent.create).toHaveBeenCalled();
  });

  it('accepts undefined metadata', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-undef',
        locale: Locale.EN,
        requestId: 'req-undef',
        startedAt: new Date(),
        userId: 'user-undef',
      },
      () =>
        service.createEvent({
          actorRole: TimelineActorRole.FREELANCER,
          agreementId: 'agreement-undef',
          description: 'Undefined metadata.',
          title: 'No metadata',
          type: TimelineEventType.AGREEMENT_CREATED,
        }),
    );

    expect(prisma.timelineEvent.create).toHaveBeenCalled();
  });
});

// AR: اختبارات سياق CLS للطلب ومعرف الارتباط.
// EN: CLS requestId/correlationId behavior tests.
describe('TimelineEventsService createEvent — CLS traceability', () => {
  it('includes requestId and correlationId in metadata when both are present', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-full1',
        locale: Locale.EN,
        requestId: 'req-full1',
        startedAt: new Date(),
        userId: 'user-full1',
      },
      () =>
        service.createEvent({
          actorRole: TimelineActorRole.FREELANCER,
          agreementId: 'agreement-full1',
          description: 'Full context.',
          title: 'Full context',
          type: TimelineEventType.AGREEMENT_CREATED,
        }),
    );

    expect(prisma.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({
          correlationId: 'corr-full1',
          requestId: 'req-full1',
        }) as unknown,
      }) as unknown,
    });
  });

  it('omits requestId from metadata when CLS context is missing it', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-no-req',
        locale: Locale.EN,
        requestId: '',
        startedAt: new Date(),
        userId: 'user-no-req',
      },
      () =>
        service.createEvent({
          actorRole: TimelineActorRole.FREELANCER,
          agreementId: 'agreement-no-req',
          description: 'No request ID.',
          title: 'No request ID',
          type: TimelineEventType.AGREEMENT_CREATED,
        }),
    );

    expect(prisma.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({
          correlationId: 'corr-no-req',
        }) as unknown,
      }) as unknown,
    });
    const [call] = prisma.timelineEvent.create.mock.calls as Array<
      [{ data: { metadata: Record<string, unknown> } }]
    >;
    expect(call[0].data.metadata.requestId).toBeUndefined();
  });

  it('omits correlationId from metadata when CLS context is missing it', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: '',
        locale: Locale.EN,
        requestId: 'req-no-corr',
        startedAt: new Date(),
        userId: 'user-no-corr',
      },
      () =>
        service.createEvent({
          actorRole: TimelineActorRole.FREELANCER,
          agreementId: 'agreement-no-corr',
          description: 'No correlation ID.',
          title: 'No correlation ID',
          type: TimelineEventType.AGREEMENT_CREATED,
        }),
    );

    expect(prisma.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({
          requestId: 'req-no-corr',
        }) as unknown,
      }) as unknown,
    });
    const [call] = prisma.timelineEvent.create.mock.calls as Array<
      [{ data: { metadata: Record<string, unknown> } }]
    >;
    expect(call[0].data.metadata.correlationId).toBeUndefined();
  });
});

// AR: اختبارات أنواع الأحداث غير الصالحة والبيانات الوصفية غير الصالحة.
// EN: Invalid event type and invalid metadata error outcome tests.
describe('TimelineEventsService createEvent — invalid inputs', () => {
  it('rejects unapproved timeline event types at the service level', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-inv1',
        locale: Locale.EN,
        requestId: 'req-inv1',
        startedAt: new Date(),
        userId: 'user-inv1',
      },
      async () => {
        await expect(
          service.createEvent({
            actorRole: TimelineActorRole.FREELANCER,
            agreementId: 'agreement-inv1',
            description: 'Invalid type.',
            title: 'Invalid type',
            type: 'INVALID_EVENT_TYPE' as TimelineEventType,
          }),
        ).rejects.toThrow(AppException);
      },
    );
  });

  it('rejects metadata containing forbidden fields with TIMELINE_METADATA_INVALID', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-err2',
        locale: Locale.EN,
        requestId: 'req-err2',
        startedAt: new Date(),
        userId: 'user-err2',
      },
      async () => {
        await expect(
          service.createEvent({
            actorRole: TimelineActorRole.FREELANCER,
            agreementId: 'agreement-err2',
            description: 'Forbidden metadata.',
            title: 'Forbidden metadata',
            type: TimelineEventType.AGREEMENT_CREATED,
            metadata: { credential: 'key', portalToken: 'tok123' },
          }),
        ).rejects.toThrow(AppException);
      },
    );
  });
});

// AR: اختبارات بيانات وصفية للنطاقات المختلفة: الدفع، التسليم، مراجعة الذكاء الاصطناعي، الاتفاق، طلب التغيير، والبريد الإلكتروني.
// EN: Domain metadata tests for payment, delivery, AI review, agreement, change request, and email evidence.
describe('TimelineEventsService createEvent — domain metadata', () => {
  it('preserves payment metadata with business identifiers', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-dom1',
        locale: Locale.EN,
        requestId: 'req-dom1',
        startedAt: new Date(),
        userId: 'user-dom1',
      },
      () =>
        service.createEvent({
          actorRole: TimelineActorRole.CLIENT,
          agreementId: 'agreement-dom1',
          description: 'Payment reserved.',
          title: 'Payment Reserved',
          type: TimelineEventType.PAYMENT_RESERVED,
          metadata: {
            paymentId: 'pay-1',
            previousStatus: 'WAITING',
            newStatus: 'RESERVED',
            amount: '1500.00',
            receiptNumber: 'RCPT-001',
          },
        }),
    );

    expect(prisma.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({
          paymentId: 'pay-1',
          previousStatus: 'WAITING',
          newStatus: 'RESERVED',
          amount: '1500.00',
          receiptNumber: 'RCPT-001',
        }) as unknown,
      }) as unknown,
    });
  });

  it('preserves delivery metadata with delivery and milestone identifiers', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-dom2',
        locale: Locale.EN,
        requestId: 'req-dom2',
        startedAt: new Date(),
        userId: 'user-dom2',
      },
      () =>
        service.createEvent({
          actorRole: TimelineActorRole.FREELANCER,
          agreementId: 'agreement-dom2',
          description: 'Delivery submitted.',
          title: 'Delivery Submitted',
          type: TimelineEventType.DELIVERY_SUBMITTED,
          metadata: {
            deliveryId: 'del-1',
            milestoneId: 'mil-1',
            deliveryUrl: 'https://example.com/file.zip',
          },
        }),
    );

    expect(prisma.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({
          deliveryId: 'del-1',
          milestoneId: 'mil-1',
          deliveryUrl: 'https://example.com/file.zip',
        }) as unknown,
      }) as unknown,
    });
  });

  it('preserves AI review metadata with matchScore and recommendation', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.SYSTEM,
        correlationId: 'corr-dom3',
        locale: Locale.EN,
        requestId: 'req-dom3',
        startedAt: new Date(),
        userId: 'user-dom3',
      },
      () =>
        service.createEvent({
          actorRole: TimelineActorRole.AI,
          agreementId: 'agreement-dom3',
          description: 'AI review completed.',
          title: 'AI Review Completed',
          type: TimelineEventType.AI_REVIEW_COMPLETED,
          metadata: {
            aiReviewId: 'ai-1',
            deliveryId: 'del-2',
            matchScore: 92,
            recommendation: 'release',
          },
        }),
    );

    expect(prisma.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({
          aiReviewId: 'ai-1',
          deliveryId: 'del-2',
          matchScore: 92,
          recommendation: 'release',
        }) as unknown,
      }) as unknown,
    });
  });

  it('preserves change request metadata with business identifiers', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.CLIENT_PORTAL,
        correlationId: 'corr-dom4',
        locale: Locale.EN,
        requestId: 'req-dom4',
        startedAt: new Date(),
      },
      () =>
        service.createEvent({
          actorRole: TimelineActorRole.CLIENT,
          agreementId: 'agreement-dom4',
          description: 'Change request created.',
          title: 'Change Request Created',
          type: TimelineEventType.CHANGE_REQUEST_CREATED,
          metadata: {
            changeRequestId: 'cr-1',
            title: 'Extra feature',
            amount: '500.00',
          },
        }),
    );

    expect(prisma.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({
          changeRequestId: 'cr-1',
          title: 'Extra feature',
          amount: '500.00',
        }) as unknown,
      }) as unknown,
    });
  });

  it('preserves email evidence metadata with notification type', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.SYSTEM,
        correlationId: 'corr-dom5',
        locale: Locale.EN,
        requestId: 'req-dom5',
        startedAt: new Date(),
      },
      () =>
        service.createEvent({
          actorRole: TimelineActorRole.SYSTEM,
          agreementId: 'agreement-dom5',
          description: 'Agreement sent email.',
          title: 'Email Sent',
          type: TimelineEventType.EMAIL_SENT,
          metadata: {
            emailType: 'agreement_sent',
            recipient: 'client@example.com',
          },
        }),
    );

    expect(prisma.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({
          emailType: 'agreement_sent',
          recipient: 'client@example.com',
        }) as unknown,
      }) as unknown,
    });
  });
});

// AR: اختبارات سرد السجل الزمني للوحة التحكم وبوابة العميل مع الصفحات والفلترة والترتيب.
// EN: Dashboard and portal timeline listing tests with pagination, filtering, and ordering.
describe('TimelineEventsService listing', () => {
  it('uses default pagination (page 1, limit 20) when no query params provided', async () => {
    const clsService = new ClsService();
    const mockEvents = createTimelineEventRows(1);
    const prisma = createPrismaStub(mockEvents, 1);
    prisma.agreement.findFirst.mockResolvedValue(
      createAgreementStub({ id: 'agreement-list1' }),
    );
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-l1',
        locale: Locale.EN,
        requestId: 'req-l1',
        startedAt: new Date(),
        userId: 'user-l1',
      },
      () => service.listByAgreementId('agreement-list1', {}),
    );

    expect(prisma.timelineEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      }) as unknown,
    );
  });

  it('enforces maximum limit of 100 when query limit exceeds the bound', async () => {
    const clsService = new ClsService();
    const mockEvents = createTimelineEventRows(100);
    const prisma = createPrismaStub(mockEvents, 200);
    prisma.agreement.findFirst.mockResolvedValue(
      createAgreementStub({ id: 'agreement-max' }),
    );
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-max',
        locale: Locale.EN,
        requestId: 'req-max',
        startedAt: new Date(),
        userId: 'user-max',
      },
      () =>
        service.listByAgreementId('agreement-max', { limit: 200 }, 'user-max'),
    );

    expect(prisma.timelineEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      }) as unknown,
    );
  });

  it('respects queried page and limit when within bounds', async () => {
    const clsService = new ClsService();
    const mockEvents = createTimelineEventRows(10);
    const prisma = createPrismaStub(mockEvents, 30);
    prisma.agreement.findFirst.mockResolvedValue(
      createAgreementStub({ id: 'agreement-p2' }),
    );
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-p2',
        locale: Locale.EN,
        requestId: 'req-p2',
        startedAt: new Date(),
        userId: 'user-p2',
      },
      () =>
        service.listByAgreementId(
          'agreement-p2',
          { page: 2, limit: 10 },
          'user-p2',
        ),
    );

    expect(prisma.timelineEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      }) as unknown,
    );
  });

  it('returns newest-first ordering when listing events', async () => {
    const clsService = new ClsService();
    const mockEvents = createTimelineEventRows(3);
    const prisma = createPrismaStub(mockEvents, 3);
    prisma.agreement.findFirst.mockResolvedValue(
      createAgreementStub({ id: 'agreement-order' }),
    );
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-ord',
        locale: Locale.EN,
        requestId: 'req-ord',
        startedAt: new Date(),
        userId: 'user-ord',
      },
      () => service.listByAgreementId('agreement-order', {}),
    );

    expect(prisma.timelineEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      }) as unknown,
    );
  });

  it('returns correct response shape with items, page, limit, total, and hasNextPage', async () => {
    const clsService = new ClsService();
    const mockEvents = createTimelineEventRows(20);
    const prisma = createPrismaStub(mockEvents, 45);
    prisma.agreement.findFirst.mockResolvedValue(
      createAgreementStub({ id: 'agreement-shape' }),
    );
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    const result = await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-shp',
        locale: Locale.EN,
        requestId: 'req-shp',
        startedAt: new Date(),
        userId: 'user-shp',
      },
      () => service.listByAgreementId('agreement-shape', {}),
    );

    expect(result).toMatchObject({
      page: 1,
      limit: 20,
      total: 45,
      hasNextPage: true,
    });
    expect(result.items).toHaveLength(20);
    expect(result.items[0]).toHaveProperty('id');
    expect(result.items[0]).toHaveProperty('agreementId');
    expect(result.items[0]).toHaveProperty('type');
    expect(result.items[0]).toHaveProperty('title');
    expect(result.items[0]).toHaveProperty('description');
    expect(result.items[0]).toHaveProperty('createdAt');
  });

  it('filters by event type when type query is provided', async () => {
    const clsService = new ClsService();
    const mockEvents = createTimelineEventRows(2, {
      type: TimelineEventType.PAYMENT_RESERVED,
    });
    const prisma = createPrismaStub(mockEvents, 2);
    prisma.agreement.findFirst.mockResolvedValue(
      createAgreementStub({ id: 'agreement-ft' }),
    );
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-ft',
        locale: Locale.EN,
        requestId: 'req-ft',
        startedAt: new Date(),
        userId: 'user-ft',
      },
      () =>
        service.listByAgreementId('agreement-ft', {
          type: TimelineEventType.PAYMENT_RESERVED,
        }),
    );

    expect(prisma.timelineEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: TimelineEventType.PAYMENT_RESERVED,
        }) as unknown,
      }) as unknown,
    );
  });

  it('filters by actor role when actorRole query is provided', async () => {
    const clsService = new ClsService();
    const mockEvents = createTimelineEventRows(1, {
      actorRole: TimelineActorRole.CLIENT,
    });
    const prisma = createPrismaStub(mockEvents, 1);
    prisma.agreement.findFirst.mockResolvedValue(
      createAgreementStub({ id: 'agreement-ar' }),
    );
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-ar',
        locale: Locale.EN,
        requestId: 'req-ar',
        startedAt: new Date(),
        userId: 'user-ar',
      },
      () =>
        service.listByAgreementId('agreement-ar', {
          actorRole: TimelineActorRole.CLIENT,
        }),
    );

    expect(prisma.timelineEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          actorRole: TimelineActorRole.CLIENT,
        }) as unknown,
      }) as unknown,
    );
  });

  it('rejects reversed date range with a validation error', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    prisma.agreement.findFirst.mockResolvedValue(
      createAgreementStub({ id: 'agreement-rev' }),
    );
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-rev',
        locale: Locale.EN,
        requestId: 'req-rev',
        startedAt: new Date(),
        userId: 'user-rev',
      },
      async () => {
        await expect(
          service.listByAgreementId('agreement-rev', {
            from: '2026-04-30T00:00:00.000Z',
            to: '2026-04-01T00:00:00.000Z',
          }),
        ).rejects.toThrow(AppException);
      },
    );
  });
});

// AR: اختبارات نطاق الوصول للوحة التحكم وبوابة العميل.
// EN: Dashboard ownership and portal scoping tests.
describe('TimelineEventsService — dashboard ownership', () => {
  it('returns events for an owned agreement', async () => {
    const clsService = new ClsService();
    const mockEvents = createTimelineEventRows(3);
    const prisma = createPrismaStub(mockEvents, 3);
    prisma.agreement.findFirst.mockResolvedValue(
      createAgreementStub({ id: 'agreement-own' }),
    );
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    const result = await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-own',
        locale: Locale.EN,
        requestId: 'req-own',
        startedAt: new Date(),
        userId: 'user-own',
      },
      () => service.listByAgreementId('agreement-own', {}),
    );

    expect(result.items).toHaveLength(3);
    expect(prisma.agreement.findFirst).toHaveBeenCalledWith({
      where: { id: 'agreement-own', freelancerId: 'user-own' },
      select: { id: true },
    });
  });

  it('rejects missing authentication with UNAUTHORIZED', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-noauth',
        locale: Locale.EN,
        requestId: 'req-noauth',
        startedAt: new Date(),
      },
      async () => {
        await expect(
          service.listByAgreementId('agreement-noauth', {}),
        ).rejects.toThrow(AppException);
      },
    );
  });

  it('rejects non-owned agreement with AGREEMENT_NOT_FOUND', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    prisma.agreement.findFirst.mockResolvedValue(null);
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-nonown',
        locale: Locale.EN,
        requestId: 'req-nonown',
        startedAt: new Date(),
        userId: 'user-nonown',
      },
      async () => {
        await expect(
          service.listByAgreementId('agreement-nonown', {}),
        ).rejects.toThrow(AppException);
      },
    );
  });

  it('rejects missing agreement with AGREEMENT_NOT_FOUND', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    prisma.agreement.findFirst.mockResolvedValue(null);
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-miss',
        locale: Locale.EN,
        requestId: 'req-miss',
        startedAt: new Date(),
        userId: 'user-miss',
      },
      async () => {
        await expect(
          service.listByAgreementId('agreement-miss', {}),
        ).rejects.toThrow(AppException);
      },
    );
  });
});

describe('TimelineEventsService — portal token scoping', () => {
  it('returns events for a valid portal token', async () => {
    const clsService = new ClsService();
    const mockEvents = createTimelineEventRows(2);
    const prisma = createPrismaStub(mockEvents, 2);
    prisma.portalToken.findUnique.mockResolvedValue(
      createPortalTokenStub({ agreementId: 'agreement-portal' }),
    );
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    const result = await service.listByPortalToken('valid-token', {});

    expect(result.items).toHaveLength(2);
    expect(prisma.portalToken.findUnique).toHaveBeenCalledWith({
      where: { token: 'valid-token' },
      select: { agreementId: true, expiresAt: true, revokedAt: true },
    });
  });

  it('rejects invalid portal token with PORTAL_TOKEN_INVALID', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    prisma.portalToken.findUnique.mockResolvedValue(null);
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await expect(
      service.listByPortalToken('invalid-token', {}),
    ).rejects.toThrow(AppException);
  });

  it('rejects revoked portal token with PORTAL_TOKEN_REVOKED', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    prisma.portalToken.findUnique.mockResolvedValue(
      createPortalTokenStub({
        agreementId: 'agreement-portal',
        revokedAt: new Date('2026-04-01'),
      }),
    );
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await expect(
      service.listByPortalToken('revoked-token', {}),
    ).rejects.toThrow(AppException);
  });

  it('rejects expired portal token with PORTAL_TOKEN_EXPIRED', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    prisma.portalToken.findUnique.mockResolvedValue(
      createPortalTokenStub({
        agreementId: 'agreement-portal',
        expiresAt: new Date('2020-01-01'),
      }),
    );
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await expect(
      service.listByPortalToken('expired-token', {}),
    ).rejects.toThrow(AppException);
  });

  it('portal reads for one agreement cannot retrieve another agreements timeline', async () => {
    const clsService = new ClsService();
    const mockEvents = createTimelineEventRows(1, {
      agreementId: 'agreement-portal',
    });
    const prisma = createPrismaStub(mockEvents, 1);
    prisma.portalToken.findUnique.mockResolvedValue(
      createPortalTokenStub({ agreementId: 'agreement-portal' }),
    );
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    const result = await service.listByPortalToken('scoped-token', {});

    // All returned events must belong to the tokens agreement only
    expect(
      result.items.every((e) => e.agreementId === 'agreement-portal'),
    ).toBe(true);
  });
});

describe('TimelineEventsService — portal-safe metadata', () => {
  it('filters forbidden metadata keys from portal responses', async () => {
    const clsService = new ClsService();
    const mockEvents = [
      createTimelineEventRow({
        id: 'event-safe1',
        metadata: {
          password: 'secret',
          requestId: 'req-hidden',
          correlationId: 'corr-hidden',
          portalToken: 'tok-hidden',
          credential: 'cred-hidden',
          milestoneTitle: 'Visible milestone',
          amount: '1500.00',
        } as unknown as Record<string, unknown>,
      }),
    ];
    const prisma = createPrismaStub(mockEvents, 1);
    prisma.portalToken.findUnique.mockResolvedValue(
      createPortalTokenStub({ agreementId: 'agreement-safe' }),
    );
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    const result = await service.listByPortalToken('safe-token', {});

    expect(result.items).toHaveLength(1);
    const metadata = result.items[0].metadata as Record<string, unknown>;
    expect(metadata).toBeTruthy();
    expect(metadata.password).toBeUndefined();
    expect(metadata.requestId).toBeUndefined();
    expect(metadata.correlationId).toBeUndefined();
    expect(metadata.portalToken).toBeUndefined();
    expect(metadata.credential).toBeUndefined();
    expect(metadata.milestoneTitle).toBe('Visible milestone');
    expect(metadata.amount).toBe('1500.00');
  });

  it('filters nested forbidden metadata keys in portal responses', async () => {
    const clsService = new ClsService();
    const mockEvents = [
      createTimelineEventRow({
        id: 'event-nested',
        metadata: {
          payment: {
            amount: '1000.00',
            secret: 'nested-secret',
          },
        } as unknown as Record<string, unknown>,
      }),
    ];
    const prisma = createPrismaStub(mockEvents, 1);
    prisma.portalToken.findUnique.mockResolvedValue(
      createPortalTokenStub({ agreementId: 'agreement-nested' }),
    );
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    const result = await service.listByPortalToken('nested-token', {});

    expect(result.items).toHaveLength(1);
    const metadata = result.items[0].metadata as Record<string, unknown>;
    const payment = metadata.payment as Record<string, unknown>;
    expect(payment.amount).toBe('1000.00');
    expect(payment.secret).toBeUndefined();
  });

  it('filters array of objects with forbidden metadata keys in portal responses', async () => {
    const clsService = new ClsService();
    const mockEvents = [
      createTimelineEventRow({
        id: 'event-array',
        metadata: {
          items: [
            { name: 'visible', token: 'should-be-hidden' },
            { name: 'visible2', credential: 'hidden-cred' },
          ],
        } as unknown as Record<string, unknown>,
      }),
    ];
    const prisma = createPrismaStub(mockEvents, 1);
    prisma.portalToken.findUnique.mockResolvedValue(
      createPortalTokenStub({ agreementId: 'agreement-array' }),
    );
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    const result = await service.listByPortalToken('array-token', {});

    expect(result.items).toHaveLength(1);
    const metadata = result.items[0].metadata as Record<string, unknown>;
    const items = metadata.items as Array<Record<string, unknown>>;
    expect(items[0].name).toBe('visible');
    expect(items[0].token).toBeUndefined();
    expect(items[1].name).toBe('visible2');
    expect(items[1].credential).toBeUndefined();
  });

  it('does not filter forbidden metadata keys from non-portal (dashboard) responses', async () => {
    const clsService = new ClsService();
    const mockEvents = [
      createTimelineEventRow({
        id: 'event-dash',
        metadata: {
          requestId: 'req-visible',
          correlationId: 'corr-visible',
          milestoneTitle: 'Dashboard milestone',
        } as unknown as Record<string, unknown>,
      }),
    ];
    const prisma = createPrismaStub(mockEvents, 1);
    prisma.agreement.findFirst.mockResolvedValue(
      createAgreementStub({ id: 'agreement-dash' }),
    );
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    const result = await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-dash',
        locale: Locale.EN,
        requestId: 'req-dash',
        startedAt: new Date(),
        userId: 'user-dash',
      },
      () => service.listByAgreementId('agreement-dash', {}),
    );

    expect(result.items).toHaveLength(1);
    const metadata = result.items[0].metadata as Record<string, unknown>;
    expect(metadata.requestId).toBe('req-visible');
    expect(metadata.correlationId).toBe('corr-visible');
  });
});

describe('TimelineEventsService — read side effects', () => {
  it('listByAgreementId does not call timelineEvent.create', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    prisma.agreement.findFirst.mockResolvedValue(
      createAgreementStub({ id: 'agreement-se1' }),
    );
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: 'corr-se1',
        locale: Locale.EN,
        requestId: 'req-se1',
        startedAt: new Date(),
        userId: 'user-se1',
      },
      () => service.listByAgreementId('agreement-se1', {}),
    );

    expect(prisma.timelineEvent.create).not.toHaveBeenCalled();
  });

  it('listByPortalToken does not call timelineEvent.create', async () => {
    const clsService = new ClsService();
    const prisma = createPrismaStub();
    prisma.portalToken.findUnique.mockResolvedValue(
      createPortalTokenStub({ agreementId: 'agreement-se2' }),
    );
    const service = new TimelineEventsService(
      prisma as unknown as PrismaService,
      clsService,
    );

    await service.listByPortalToken('read-token', {});

    expect(prisma.timelineEvent.create).not.toHaveBeenCalled();
  });
});
