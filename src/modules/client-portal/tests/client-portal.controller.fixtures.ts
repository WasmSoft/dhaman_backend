import {
  VALID_TOKEN,
  INVALID_TOKEN,
  EXPIRED_TOKEN,
  REVOKED_TOKEN,
  DELIVERY_UUID,
  PAYMENT_UUID,
  AGREEMENT_UUID,
} from './client-portal.controller.test-utils';

export { VALID_TOKEN, INVALID_TOKEN, EXPIRED_TOKEN, REVOKED_TOKEN, DELIVERY_UUID, PAYMENT_UUID, AGREEMENT_UUID };

// ──────────────────────────────────────────────
//  Two-agreement scoping fixtures (Phase 5 cross-agreement tests)
// ──────────────────────────────────────────────

export const AGREEMENT_A_UUID = '223e4567-e89b-12d3-a456-426614174000';
export const AGREEMENT_B_UUID = '323e4567-e89b-12d3-a456-426614174999';
export const AGREEMENT_A_TOKEN = 'valid-token-for-agreement-A';
export const AGREEMENT_B_TOKEN = 'valid-token-for-agreement-B';

export const DELIVERY_A_UUID = '523e4567-e89b-12d3-a456-426614174000';
export const DELIVERY_B_UUID = '623e4567-e89b-12d3-a456-426614174999';
export const PAYMENT_A_UUID = '723e4567-e89b-12d3-a456-426614174000';
export const PAYMENT_B_UUID = '823e4567-e89b-12d3-a456-426614174999';
export const TIMELINE_A_UUID = '923e4567-e89b-12d3-a456-426614174000';
export const TIMELINE_B_UUID = 'a23e4567-e89b-12d3-a456-426614174999';

/**
 * Agreement A: The agreement the portal token belongs to.
 * All portal actions using token A should access THIS agreement's resources.
 */
export function makeAgreementAFixture() {
  return {
    id: AGREEMENT_A_UUID,
    title: 'Agreement A — Portal Owned',
    status: 'SENT',
    totalAmount: '5000.00',
    currency: 'SAR',
    freelancerId: 'freelancer-1',
    clientId: 'client-1',
    milestones: [],
    payments: [],
    deliveries: [],
    changeRequests: [],
    timelineEvents: [],
  };
}

/**
 * Agreement B: A different agreement that the portal token should NEVER access.
 */
export function makeAgreementBFixture() {
  return {
    id: AGREEMENT_B_UUID,
    title: 'Agreement B — Not Portal Owned',
    status: 'APPROVED',
    totalAmount: '3000.00',
    currency: 'SAR',
    freelancerId: 'freelancer-2',
    clientId: 'client-2',
    milestones: [],
    payments: [],
    deliveries: [],
    changeRequests: [],
    timelineEvents: [],
  };
}

/** Delivery belonging to Agreement A */
export function makeDeliveryAFixture() {
  return {
    id: DELIVERY_A_UUID,
    agreementId: AGREEMENT_A_UUID,
    milestoneId: 'milestone-a1',
    status: 'SUBMITTED',
    submittedAt: new Date('2026-02-15'),
    notes: 'Ready for review',
    milestone: { title: 'Logo Design' },
  };
}

/** Delivery belonging to Agreement B (cross-scope) */
export function makeDeliveryBFixture() {
  return {
    id: DELIVERY_B_UUID,
    agreementId: AGREEMENT_B_UUID,
    milestoneId: 'milestone-b1',
    status: 'SUBMITTED',
    submittedAt: new Date('2026-02-15'),
    notes: 'Other delivery',
    milestone: { title: 'Web Design' },
  };
}

/** Payment belonging to Agreement A */
export function makePaymentAFixture() {
  return {
    id: PAYMENT_A_UUID,
    agreementId: AGREEMENT_A_UUID,
    milestoneId: 'milestone-a1',
    amount: '2500.00',
    currency: 'SAR',
    status: 'WAITING',
    demoMode: true,
    reservedAt: null,
    releasedAt: null,
    createdAt: new Date('2026-01-01'),
  };
}

/** Payment belonging to Agreement B (cross-scope) */
export function makePaymentBFixture() {
  return {
    id: PAYMENT_B_UUID,
    agreementId: AGREEMENT_B_UUID,
    milestoneId: 'milestone-b1',
    amount: '1500.00',
    currency: 'SAR',
    status: 'RESERVED',
    demoMode: true,
    reservedAt: new Date('2026-01-15'),
    releasedAt: null,
    createdAt: new Date('2026-01-01'),
  };
}

/** Timeline event belonging to Agreement A */
export function makeTimelineAFixture() {
  return {
    id: TIMELINE_A_UUID,
    agreementId: AGREEMENT_A_UUID,
    type: 'AGREEMENT_APPROVED',
    actorRole: 'CLIENT',
    description: 'Approved via portal A',
    createdAt: new Date('2026-01-15'),
  };
}

/** Timeline event belonging to Agreement B (cross-scope) */
export function makeTimelineBFixture() {
  return {
    id: TIMELINE_B_UUID,
    agreementId: AGREEMENT_B_UUID,
    type: 'DELIVERY_ACCEPTED',
    actorRole: 'FREELANCER',
    description: 'Delivery accepted for B',
    createdAt: new Date('2026-02-01'),
  };
}

export const mockInviteResponse = {
  agreementId: AGREEMENT_UUID,
  title: 'Brand Identity Design',
  description: 'Full brand identity package',
  serviceType: 'Graphic Design',
  totalAmount: '5000.00',
  currency: 'SAR',
  expectedDeliveryDate: '2026-03-01T00:00:00.000Z',
  status: 'SENT',
  sentAt: '2026-01-01T00:00:00.000Z',
  freelancer: { name: 'Ahmed Hassan' },
  client: { name: 'Sara Al-Rashid', email: 'sara@example.com' },
  policy: { reviewPeriodDays: 3, revisionLimit: 2 },
  milestones: [
    {
      id: 'm1',
      order: 1,
      title: 'Logo Design',
      description: 'Vector logo in multiple formats',
      amount: '2500.00',
      currency: 'SAR',
      status: 'DRAFT',
      dueDate: '2026-02-01T00:00:00.000Z',
    },
  ],
  paymentSchedule: [
    {
      milestoneId: 'm1',
      milestoneTitle: 'Logo Design',
      amount: '2500.00',
      currency: 'SAR',
      status: 'WAITING',
    },
  ],
};

export const mockActionResponse = {
  agreementId: AGREEMENT_UUID,
  status: 'APPROVED',
  message: 'Agreement approved successfully.',
};

export const mockWorkspaceResponse = {
  agreementId: AGREEMENT_UUID,
  title: 'Brand Identity Design',
  status: 'APPROVED',
  totalAmount: '5000.00',
  currency: 'SAR',
  freelancerName: 'Ahmed Hassan',
  milestones: [],
  payments: [],
  deliveries: [],
  changeRequests: [],
  aiReviews: [],
  timeline: [],
};

export const mockDeliveryDetail = {
  id: DELIVERY_UUID,
  milestoneId: 'm1',
  milestoneTitle: 'Logo Design',
  status: 'SUBMITTED',
  submittedAt: '2026-02-15T00:00:00.000Z',
  notes: undefined,
};

export const mockPaymentList = {
  agreementId: AGREEMENT_UUID,
  payments: [
    {
      id: PAYMENT_UUID,
      milestoneId: 'm1',
      milestoneTitle: 'Logo Design',
      amount: '2500.00',
      currency: 'SAR',
      status: 'WAITING',
      demoMode: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      fundedAt: undefined,
      releasedAt: undefined,
    },
  ],
};

export const mockPaymentHistory = {
  agreementId: AGREEMENT_UUID,
  payments: [
    {
      id: PAYMENT_UUID,
      milestoneId: 'm1',
      milestoneTitle: 'Logo Design',
      amount: '2500.00',
      currency: 'SAR',
      status: 'RELEASED',
      demoMode: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      fundedAt: '2026-01-15T00:00:00.000Z',
      releasedAt: '2026-02-01T00:00:00.000Z',
    },
  ],
};

export const mockTimelineEvents = [
  {
    id: 't1',
    eventType: 'AGREEMENT_APPROVED',
    actorRole: 'CLIENT',
    description: 'Client approved agreement via portal.',
    occurredAt: '2026-01-15T00:00:00.000Z',
  },
];
