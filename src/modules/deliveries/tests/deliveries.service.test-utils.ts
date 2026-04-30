import {
  DeliveryStatus,
  PaymentStatus,
  TimelineActorRole,
} from '@prisma/client';

export function makeMockDelivery(overrides: Record<string, unknown> = {}) {
  return {
    id: 'delivery-1',
    agreementId: 'agreement-1',
    milestoneId: 'milestone-1',
    submittedById: 'freelancer-1',
    deliveryUrl: null,
    fileUrl: null,
    fileName: null,
    fileType: null,
    summary: 'Completed the homepage redesign with responsive navigation.',
    notes: null,
    status: 'DRAFT' as DeliveryStatus,
    submittedAt: null,
    acceptedAt: null,
    changesRequestedAt: null,
    clientFeedback: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    agreement: {
      id: 'agreement-1',
      freelancerId: 'freelancer-1',
      status: 'ACTIVE',
    },
    milestone: {
      id: 'milestone-1',
      agreementId: 'agreement-1',
      title: 'Brand identity delivery',
      status: 'ACTIVE',
      paymentStatus: 'RESERVED',
      deliveryStatus: 'DRAFT',
      revisionLimit: 3,
    },
    ...overrides,
  };
}

export function makeMockMilestone(overrides: Record<string, unknown> = {}) {
  return {
    id: 'milestone-1',
    agreementId: 'agreement-1',
    title: 'Brand identity delivery',
    status: 'ACTIVE',
    paymentStatus: 'RESERVED' as PaymentStatus,
    deliveryStatus: 'DRAFT' as DeliveryStatus,
    revisionLimit: 3,
    agreement: {
      id: 'agreement-1',
      freelancerId: 'freelancer-1',
      status: 'ACTIVE',
    },
    ...overrides,
  };
}

export function makeMockAgreement(overrides: Record<string, unknown> = {}) {
  return {
    id: 'agreement-1',
    freelancerId: 'freelancer-1',
    status: 'ACTIVE',
    ...overrides,
  };
}

export function makeMockPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'payment-1',
    agreementId: 'agreement-1',
    milestoneId: 'milestone-1',
    status: 'RESERVED' as PaymentStatus,
    demoMode: true,
    reservedAt: new Date('2026-01-01'),
    releasedAt: null,
    ...overrides,
  };
}

export function makeMockPortalToken(overrides: Record<string, unknown> = {}) {
  return {
    id: 'portal-token-1',
    agreementId: 'agreement-1',
    token: 'valid-review-token',
    type: 'DELIVERY_REVIEW',
    expiresAt: new Date('2027-01-01'),
    revokedAt: null,
    ...overrides,
  };
}

export function makeMockClsContext(overrides: Record<string, unknown> = {}) {
  return {
    requestId: 'req-001',
    correlationId: 'corr-001',
    userId: 'freelancer-1',
    actorType: 'FREELANCER',
    locale: 'en',
    startedAt: new Date(),
    ...overrides,
  };
}

export function buildPrismaMock() {
  return {
    delivery: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    milestone: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    agreement: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    portalToken: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((cb: Function) => cb({})),
  };
}

export function buildTimelineServiceMock() {
  return {
    createEvent: jest.fn().mockResolvedValue({ id: 'timeline-1' }),
  };
}

export function buildPaymentsServiceMock() {
  return {
    transitionToClientReview: jest
      .fn()
      .mockResolvedValue({ id: 'payment-1', status: 'CLIENT_REVIEW' }),
    transitionToReadyToRelease: jest
      .fn()
      .mockResolvedValue({ id: 'payment-1', status: 'READY_TO_RELEASE' }),
    transitionToOnHold: jest
      .fn()
      .mockResolvedValue({ id: 'payment-1', status: 'ON_HOLD' }),
  };
}

export function buildEmailServiceMock() {
  return {
    enqueueDeliverySubmittedForClient: jest.fn().mockResolvedValue(undefined),
    enqueueDeliveryChangesRequestedForFreelancer: jest
      .fn()
      .mockResolvedValue(undefined),
  };
}

export function buildClsServiceMock() {
  return {
    get: jest.fn((key: string) => {
      if (key === 'userId') return 'freelancer-1';
      if (key === 'requestId') return 'req-001';
      return undefined;
    }),
    getContext: jest.fn().mockReturnValue({
      requestId: 'req-001',
      correlationId: 'corr-001',
      userId: 'freelancer-1',
      actorType: 'FREELANCER',
      locale: 'en',
      startedAt: new Date(),
    }),
  };
}
