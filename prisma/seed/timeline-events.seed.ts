import { TimelineActorRole, TimelineEventType } from '@prisma/client';
import { SeedClient, SeedContext } from './types';

const events = [
  {
    id: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
    agreementKey: 'activePortal',
    milestoneKey: null,
    actorRole: TimelineActorRole.FREELANCER,
    actorKey: 'demoAdmin',
    type: TimelineEventType.AGREEMENT_CREATED,
    title: 'Agreement created',
    description: 'Demo Admin drafted the retail analytics portal agreement.',
    createdAt: new Date('2026-05-02T09:00:00.000Z'),
  },
  {
    id: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2',
    agreementKey: 'activePortal',
    milestoneKey: 'portalDiscovery',
    actorRole: TimelineActorRole.CLIENT,
    actorKey: null,
    type: TimelineEventType.PAYMENT_RELEASED,
    title: 'Payment released',
    description: 'Discovery milestone funds were released after acceptance.',
    createdAt: new Date('2026-05-24T09:00:00.000Z'),
  },
  {
    id: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3',
    agreementKey: 'activePortal',
    milestoneKey: 'portalBuild',
    actorRole: TimelineActorRole.FREELANCER,
    actorKey: 'demoAdmin',
    type: TimelineEventType.DELIVERY_SUBMITTED,
    title: 'Delivery submitted',
    description: 'Portal build delivery is ready for client review.',
    createdAt: new Date('2026-06-18T18:45:00.000Z'),
  },
  {
    id: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4',
    agreementKey: 'disputedClinic',
    milestoneKey: 'clinicFrontend',
    actorRole: TimelineActorRole.AI,
    actorKey: null,
    type: TimelineEventType.AI_REVIEW_COMPLETED,
    title: 'AI review completed',
    description:
      'AI recommended partial acceptance with a focused change request.',
    createdAt: new Date('2026-05-19T14:00:00.000Z'),
  },
  {
    id: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd5',
    agreementKey: 'completedBrand',
    milestoneKey: 'brandKit',
    actorRole: TimelineActorRole.CLIENT,
    actorKey: null,
    type: TimelineEventType.PAYMENT_RELEASED,
    title: 'Agreement completed',
    description: 'Client accepted all launch kit assets and released payment.',
    createdAt: new Date('2026-04-08T10:00:00.000Z'),
  },
] as const;

export async function seedTimelineEvents(
  prisma: SeedClient,
  context: SeedContext,
): Promise<void> {
  for (const event of events) {
    await prisma.timelineEvent.upsert({
      where: { id: event.id },
      update: {
        actorId: event.actorKey ? context.users[event.actorKey] : null,
        actorRole: event.actorRole,
        agreementId: context.agreements[event.agreementKey],
        correlationId: `corr-${event.id.slice(0, 8)}`,
        createdAt: event.createdAt,
        description: event.description,
        metadata: { seeded: true },
        milestoneId: event.milestoneKey
          ? context.milestones[event.milestoneKey]
          : null,
        requestId: `req-${event.id.slice(0, 8)}`,
        title: event.title,
        type: event.type,
      },
      create: {
        id: event.id,
        actorId: event.actorKey ? context.users[event.actorKey] : null,
        actorRole: event.actorRole,
        agreementId: context.agreements[event.agreementKey],
        correlationId: `corr-${event.id.slice(0, 8)}`,
        createdAt: event.createdAt,
        description: event.description,
        metadata: { seeded: true },
        milestoneId: event.milestoneKey
          ? context.milestones[event.milestoneKey]
          : null,
        requestId: `req-${event.id.slice(0, 8)}`,
        title: event.title,
        type: event.type,
      },
    });
  }
}
