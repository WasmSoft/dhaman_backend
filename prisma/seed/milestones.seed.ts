import { DeliveryStatus, MilestoneStatus, PaymentStatus } from '@prisma/client';
import { SeedClient, SeedContext } from './types';

const milestones = [
  {
    id: '66666666-6666-4666-8666-666666666661',
    key: 'portalDiscovery',
    agreementKey: 'activePortal',
    title: 'Discovery and UX Architecture',
    amount: '9000.00',
    status: MilestoneStatus.ACCEPTED,
    paymentStatus: PaymentStatus.RELEASED,
    deliveryStatus: DeliveryStatus.ACCEPTED,
    order: 1,
    dueDate: new Date('2026-05-24T09:00:00.000Z'),
  },
  {
    id: '66666666-6666-4666-8666-666666666662',
    key: 'portalBuild',
    agreementKey: 'activePortal',
    title: 'Portal Build and API Integration',
    amount: '23000.00',
    status: MilestoneStatus.IN_REVIEW,
    paymentStatus: PaymentStatus.CLIENT_REVIEW,
    deliveryStatus: DeliveryStatus.SUBMITTED,
    order: 2,
    dueDate: new Date('2026-06-22T09:00:00.000Z'),
  },
  {
    id: '66666666-6666-4666-8666-666666666663',
    key: 'portalLaunch',
    agreementKey: 'activePortal',
    title: 'Launch Support and Training',
    amount: '10000.00',
    status: MilestoneStatus.ACTIVE,
    paymentStatus: PaymentStatus.RESERVED,
    deliveryStatus: DeliveryStatus.NOT_SUBMITTED,
    order: 3,
    dueDate: new Date('2026-07-15T09:00:00.000Z'),
  },
  {
    id: '66666666-6666-4666-8666-666666666664',
    key: 'automationAudit',
    agreementKey: 'draftAutomation',
    title: 'Workflow Audit',
    amount: '6500.00',
    status: MilestoneStatus.DRAFT,
    paymentStatus: PaymentStatus.WAITING,
    deliveryStatus: DeliveryStatus.DRAFT,
    order: 1,
    dueDate: new Date('2026-06-01T09:00:00.000Z'),
  },
  {
    id: '66666666-6666-4666-8666-666666666665',
    key: 'clinicFrontend',
    agreementKey: 'disputedClinic',
    title: 'Booking Frontend Delivery',
    amount: '17000.00',
    status: MilestoneStatus.CHANGES_REQUESTED,
    paymentStatus: PaymentStatus.AI_REVIEW,
    deliveryStatus: DeliveryStatus.DISPUTED,
    order: 1,
    dueDate: new Date('2026-05-18T09:00:00.000Z'),
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    key: 'brandKit',
    agreementKey: 'completedBrand',
    title: 'Brand Kit and Launch Assets',
    amount: '9500.00',
    status: MilestoneStatus.ACCEPTED,
    paymentStatus: PaymentStatus.RELEASED,
    deliveryStatus: DeliveryStatus.ACCEPTED,
    order: 1,
    dueDate: new Date('2026-04-08T09:00:00.000Z'),
  },
] as const;

export async function seedMilestones(
  prisma: SeedClient,
  context: SeedContext,
): Promise<void> {
  for (const milestone of milestones) {
    const created = await prisma.milestone.upsert({
      where: { id: milestone.id },
      update: {
        acceptanceCriteria: [
          'Deliverables match the approved scope.',
          'Client can review using the shared delivery link.',
          'Critical defects are resolved before acceptance.',
        ],
        agreementId: context.agreements[milestone.agreementKey],
        amount: milestone.amount,
        currency: milestone.agreementKey === 'completedBrand' ? 'USD' : 'SAR',
        deliveryStatus: milestone.deliveryStatus,
        description: `${milestone.title} with documented handoff notes.`,
        dueDate: milestone.dueDate,
        order: milestone.order,
        paymentStatus: milestone.paymentStatus,
        revisionLimit: milestone.key === 'clinicFrontend' ? 3 : 2,
        status: milestone.status,
        title: milestone.title,
      },
      create: {
        id: milestone.id,
        acceptanceCriteria: [
          'Deliverables match the approved scope.',
          'Client can review using the shared delivery link.',
          'Critical defects are resolved before acceptance.',
        ],
        agreementId: context.agreements[milestone.agreementKey],
        amount: milestone.amount,
        currency: milestone.agreementKey === 'completedBrand' ? 'USD' : 'SAR',
        deliveryStatus: milestone.deliveryStatus,
        description: `${milestone.title} with documented handoff notes.`,
        dueDate: milestone.dueDate,
        order: milestone.order,
        paymentStatus: milestone.paymentStatus,
        revisionLimit: milestone.key === 'clinicFrontend' ? 3 : 2,
        status: milestone.status,
        title: milestone.title,
      },
    });

    context.milestones[milestone.key] = created.id;
  }
}
