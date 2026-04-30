import {
  ChangeRequestStatus,
  PaymentOperationType,
  PaymentStatus,
  TimelineActorRole,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export function makeMockChangeRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cr-1',
    agreementId: 'agreement-1',
    milestoneId: null,
    aiReviewId: null,
    requestedByRole: 'FREELANCER' as TimelineActorRole,
    title: 'Add extra landing page',
    description:
      'Client needs an additional landing page with hero section and contact form.',
    amount: new Decimal('500.00'),
    currency: 'USD',
    additionalTimelineText: null,
    timelineDays: null,
    acceptanceCriteria: ['Landing page delivered', 'Hero section included'],
    status: 'DRAFT' as ChangeRequestStatus,
    paymentStatus: 'WAITING' as PaymentStatus,
    approvedAt: null,
    declinedAt: null,
    fundedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    metadata: {},
    agreement: {
      id: 'agreement-1',
      freelancerId: 'freelancer-1',
      status: 'ACTIVE',
    },
    payments: [],
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
    changeRequestId: null,
    milestoneId: null,
    operationType: 'MILESTONE_PAYMENT' as PaymentOperationType,
    status: 'RESERVED' as PaymentStatus,
    amount: new Decimal('500.00'),
    currency: 'USD',
    demoMode: true,
    reservedAt: new Date('2026-01-01'),
    releasedAt: null,
    ...overrides,
  };
}

export function makeMockAiReview(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ai-review-1',
    agreementId: 'agreement-1',
    recommendation: 'PARTIAL' as const,
    ...overrides,
  };
}

export function buildPrismaMock() {
  return {
    changeRequest: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    agreement: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    aIReview: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((arg: unknown) => {
      if (typeof arg === 'function') return arg({});
      if (Array.isArray(arg)) return Promise.all(arg);
      return arg;
    }),
  };
}

export function buildPaymentsServiceMock() {
  return {
    createPaymentForChangeRequest: jest.fn().mockResolvedValue({
      id: 'payment-cr-1',
      status: 'WAITING',
      amount: new Decimal('500.00'),
      currency: 'USD',
      operationType: 'CHANGE_REQUEST_PAYMENT',
    }),
    getPaymentsByChangeRequest: jest.fn().mockResolvedValue([]),
    validateTransition: jest.fn().mockReturnValue(true),
  };
}

export function buildTimelineServiceMock() {
  return {
    createEvent: jest.fn().mockResolvedValue({ id: 'timeline-1' }),
  };
}

export function buildEmailServiceMock() {
  return {
    enqueueChangeRequestSentForClient: jest.fn().mockResolvedValue(undefined),
    enqueueChangeRequestApprovedForFreelancer: jest
      .fn()
      .mockResolvedValue(undefined),
    enqueueChangeRequestDeclinedForFreelancer: jest
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
      agreementId: 'agreement-1',
      locale: 'en',
      startedAt: new Date(),
    }),
    setContext: jest.fn(),
  };
}
