import { DeliveryStatus } from '@prisma/client';
import { SeedClient, SeedContext } from './types';

const deliveries = [
  {
    id: '77777777-7777-4777-8777-777777777771',
    key: 'portalDiscoveryDelivery',
    agreementKey: 'activePortal',
    milestoneKey: 'portalDiscovery',
    submittedByKey: 'demoAdmin',
    summary:
      'Discovery report, sitemap, wireframes, and implementation backlog.',
    status: DeliveryStatus.ACCEPTED,
    submittedAt: new Date('2026-05-21T10:00:00.000Z'),
    acceptedAt: new Date('2026-05-23T15:30:00.000Z'),
    changesRequestedAt: null,
    clientFeedback: 'Approved. Please keep the dashboard export in phase two.',
  },
  {
    id: '77777777-7777-4777-8777-777777777772',
    key: 'portalBuildDelivery',
    agreementKey: 'activePortal',
    milestoneKey: 'portalBuild',
    submittedByKey: 'demoAdmin',
    summary: 'Staging portal with role-based dashboards and API integration.',
    status: DeliveryStatus.SUBMITTED,
    submittedAt: new Date('2026-06-18T18:45:00.000Z'),
    acceptedAt: null,
    changesRequestedAt: null,
    clientFeedback: null,
  },
  {
    id: '77777777-7777-4777-8777-777777777773',
    key: 'clinicDelivery',
    agreementKey: 'disputedClinic',
    milestoneKey: 'clinicFrontend',
    submittedByKey: 'demoAdmin',
    summary: 'Booking pages, intake forms, and responsive frontend handoff.',
    status: DeliveryStatus.DISPUTED,
    submittedAt: new Date('2026-05-16T13:10:00.000Z'),
    acceptedAt: null,
    changesRequestedAt: new Date('2026-05-19T08:20:00.000Z'),
    clientFeedback:
      'Client says Arabic mobile booking steps do not match the signed flow.',
  },
  {
    id: '77777777-7777-4777-8777-777777777774',
    key: 'brandDelivery',
    agreementKey: 'completedBrand',
    milestoneKey: 'brandKit',
    submittedByKey: 'freelancer',
    summary:
      'Final logo files, brand guide PDF, menu templates, and social kit.',
    status: DeliveryStatus.ACCEPTED,
    submittedAt: new Date('2026-04-05T09:15:00.000Z'),
    acceptedAt: new Date('2026-04-07T16:00:00.000Z'),
    changesRequestedAt: null,
    clientFeedback: 'Excellent work. Accepted with no additional changes.',
  },
] as const;

export async function seedDeliveries(
  prisma: SeedClient,
  context: SeedContext,
): Promise<void> {
  for (const delivery of deliveries) {
    const created = await prisma.delivery.upsert({
      where: { id: delivery.id },
      update: {
        acceptedAt: delivery.acceptedAt,
        agreementId: context.agreements[delivery.agreementKey],
        changesRequestedAt: delivery.changesRequestedAt,
        clientFeedback: delivery.clientFeedback,
        deliveryUrl: `https://demo.dhaman.local/deliveries/${delivery.key}`,
        fileName: `${delivery.key}.pdf`,
        fileType: 'application/pdf',
        fileUrl: `https://files.demo.dhaman.local/${delivery.key}.pdf`,
        milestoneId: context.milestones[delivery.milestoneKey],
        notes: 'Seeded demo delivery for visual testing.',
        status: delivery.status,
        submittedAt: delivery.submittedAt,
        submittedById: context.users[delivery.submittedByKey],
        summary: delivery.summary,
      },
      create: {
        id: delivery.id,
        acceptedAt: delivery.acceptedAt,
        agreementId: context.agreements[delivery.agreementKey],
        changesRequestedAt: delivery.changesRequestedAt,
        clientFeedback: delivery.clientFeedback,
        deliveryUrl: `https://demo.dhaman.local/deliveries/${delivery.key}`,
        fileName: `${delivery.key}.pdf`,
        fileType: 'application/pdf',
        fileUrl: `https://files.demo.dhaman.local/${delivery.key}.pdf`,
        milestoneId: context.milestones[delivery.milestoneKey],
        notes: 'Seeded demo delivery for visual testing.',
        status: delivery.status,
        submittedAt: delivery.submittedAt,
        submittedById: context.users[delivery.submittedByKey],
        summary: delivery.summary,
      },
    });

    context.deliveries[delivery.key] = created.id;
  }
}
