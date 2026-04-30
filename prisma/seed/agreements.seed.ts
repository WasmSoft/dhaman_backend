import { AgreementStatus } from '@prisma/client';
import { SeedClient, SeedContext } from './types';

const agreements = [
  {
    id: '44444444-4444-4444-8444-444444444441',
    key: 'activePortal',
    freelancerKey: 'demoAdmin',
    clientKey: 'riyadhRetail',
    title: 'Retail Analytics Portal MVP',
    description:
      'Design and build a bilingual analytics portal for store managers.',
    serviceType: 'Full-stack web development',
    totalAmount: '42000.00',
    currency: 'SAR',
    durationText: '8 weeks across three funded milestones',
    expectedDeliveryDate: new Date('2026-07-15T09:00:00.000Z'),
    status: AgreementStatus.ACTIVE,
    inviteToken: 'seed-invite-active-portal',
    portalToken: 'seed-portal-active-portal',
    approvedAt: new Date('2026-05-08T11:00:00.000Z'),
    sentAt: new Date('2026-05-03T11:00:00.000Z'),
  },
  {
    id: '44444444-4444-4444-8444-444444444442',
    key: 'draftAutomation',
    freelancerKey: 'demoAdmin',
    clientKey: 'gulfLogistics',
    title: 'Logistics Workflow Automation',
    description:
      'Discovery and automation setup for shipment exception handling.',
    serviceType: 'Automation consulting',
    totalAmount: '18500.00',
    currency: 'SAR',
    durationText: '4 weeks',
    expectedDeliveryDate: new Date('2026-06-20T09:00:00.000Z'),
    status: AgreementStatus.DRAFT,
    inviteToken: 'seed-invite-draft-automation',
    portalToken: null,
    approvedAt: null,
    sentAt: null,
  },
  {
    id: '44444444-4444-4444-8444-444444444443',
    key: 'disputedClinic',
    freelancerKey: 'demoAdmin',
    clientKey: 'healthClinic',
    title: 'Clinic Booking Website Redesign',
    description:
      'Redesign the public booking flow and integrate appointment requests.',
    serviceType: 'UX/UI and frontend development',
    totalAmount: '27000.00',
    currency: 'SAR',
    durationText: '6 weeks',
    expectedDeliveryDate: new Date('2026-05-30T09:00:00.000Z'),
    status: AgreementStatus.DISPUTED,
    inviteToken: 'seed-invite-disputed-clinic',
    portalToken: 'seed-portal-disputed-clinic',
    approvedAt: new Date('2026-04-18T14:30:00.000Z'),
    sentAt: new Date('2026-04-16T09:30:00.000Z'),
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    key: 'completedBrand',
    freelancerKey: 'freelancer',
    clientKey: 'nouraClient',
    title: 'Cafe Brand Identity Launch Kit',
    description: 'Logo, typography, menu templates, and social launch assets.',
    serviceType: 'Brand identity',
    totalAmount: '9500.00',
    currency: 'USD',
    durationText: '3 weeks',
    expectedDeliveryDate: new Date('2026-04-10T09:00:00.000Z'),
    status: AgreementStatus.COMPLETED,
    inviteToken: 'seed-invite-completed-brand',
    portalToken: 'seed-portal-completed-brand',
    approvedAt: new Date('2026-03-14T12:00:00.000Z'),
    sentAt: new Date('2026-03-12T12:00:00.000Z'),
  },
] as const;

export async function seedAgreements(
  prisma: SeedClient,
  context: SeedContext,
): Promise<void> {
  for (const agreement of agreements) {
    const created = await prisma.agreement.upsert({
      where: { id: agreement.id },
      update: {
        approvedAt: agreement.approvedAt,
        clientId: context.clients[agreement.clientKey],
        currency: agreement.currency,
        description: agreement.description,
        durationText: agreement.durationText,
        expectedDeliveryDate: agreement.expectedDeliveryDate,
        freelancerId: context.users[agreement.freelancerKey],
        inviteToken: agreement.inviteToken,
        portalToken: agreement.portalToken,
        sentAt: agreement.sentAt,
        serviceType: agreement.serviceType,
        status: agreement.status,
        title: agreement.title,
        totalAmount: agreement.totalAmount,
      },
      create: {
        id: agreement.id,
        approvedAt: agreement.approvedAt,
        clientId: context.clients[agreement.clientKey],
        currency: agreement.currency,
        description: agreement.description,
        durationText: agreement.durationText,
        expectedDeliveryDate: agreement.expectedDeliveryDate,
        freelancerId: context.users[agreement.freelancerKey],
        inviteToken: agreement.inviteToken,
        portalToken: agreement.portalToken,
        sentAt: agreement.sentAt,
        serviceType: agreement.serviceType,
        status: agreement.status,
        title: agreement.title,
        totalAmount: agreement.totalAmount,
      },
    });

    context.agreements[agreement.key] = created.id;
  }
}

export async function seedAgreementPolicies(
  prisma: SeedClient,
  context: SeedContext,
): Promise<void> {
  const policies = [
    {
      id: '55555555-5555-4555-8555-555555555551',
      agreementId: context.agreements.activePortal,
      clientReviewPeriodDays: 7,
      freelancerDelayGraceDays: 3,
    },
    {
      id: '55555555-5555-4555-8555-555555555552',
      agreementId: context.agreements.draftAutomation,
      clientReviewPeriodDays: 5,
      freelancerDelayGraceDays: 2,
    },
    {
      id: '55555555-5555-4555-8555-555555555553',
      agreementId: context.agreements.disputedClinic,
      clientReviewPeriodDays: 10,
      freelancerDelayGraceDays: 4,
    },
    {
      id: '55555555-5555-4555-8555-555555555554',
      agreementId: context.agreements.completedBrand,
      clientReviewPeriodDays: 3,
      freelancerDelayGraceDays: 1,
    },
  ];

  for (const policy of policies) {
    await prisma.agreementPolicy.upsert({
      where: { agreementId: policy.agreementId },
      update: {
        cancellationPolicy:
          'Cancellation is allowed before milestone work starts; accepted work remains payable.',
        clientReviewPeriodDays: policy.clientReviewPeriodDays,
        delayPolicy:
          'Freelancer must notify the client before the grace period expires.',
        extraRequestPolicy:
          'Any extra scope requires an approved and funded change request.',
        freelancerDelayGraceDays: policy.freelancerDelayGraceDays,
        reviewPolicy:
          'Client feedback must map to agreed acceptance criteria where possible.',
      },
      create: {
        ...policy,
        cancellationPolicy:
          'Cancellation is allowed before milestone work starts; accepted work remains payable.',
        delayPolicy:
          'Freelancer must notify the client before the grace period expires.',
        extraRequestPolicy:
          'Any extra scope requires an approved and funded change request.',
        reviewPolicy:
          'Client feedback must map to agreed acceptance criteria where possible.',
      },
    });
  }
}
