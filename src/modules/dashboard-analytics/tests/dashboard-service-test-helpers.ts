import {
  AgreementStatus,
  DeliveryStatus,
  PaymentStatus,
  Prisma,
  TimelineActorRole,
} from '@prisma/client';
import { ClsService } from '../../../common/cls/cls.service';
import { ActorType } from '../../../common/enums/actor-type.enum';
import { Locale } from '../../../common/enums/locale.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { DashboardAnalyticsService } from '../dashboard-analytics.service';

export function decimal(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export interface TestScenarioFixture {
  name: string;
  freelancers: Array<{ id: string; email: string; name: string }>;
  agreements: Array<{
    id: string;
    freelancerId: string;
    clientId: string;
    title: string;
    description: string;
    serviceType: string;
    totalAmount: Prisma.Decimal;
    currency: string;
    status: AgreementStatus;
    createdAt: Date;
  }>;
  milestones: Array<{
    id: string;
    agreementId: string;
    title: string;
    amount: Prisma.Decimal;
    currency: string;
    order: number;
    status: string;
    paymentStatus: PaymentStatus;
    deliveryStatus: DeliveryStatus;
    createdAt: Date;
  }>;
  payments: Array<{
    id: string;
    agreementId: string;
    amount: Prisma.Decimal;
    currency: string;
    status: PaymentStatus;
    operationType: string;
    demoMode: boolean;
    createdAt: Date;
  }>;
  deliveries: Array<{
    id: string;
    agreementId: string;
    milestoneId: string;
    submittedById: string;
    summary: string;
    status: DeliveryStatus;
    submittedAt: Date;
    createdAt: Date;
  }>;
  aiReviews: Array<{
    id: string;
    agreementId: string;
    milestoneId: string;
    requestedByRole: TimelineActorRole;
    objection: string;
    status: string;
    recommendation: string;
    createdAt: Date;
  }>;
  changeRequests: Array<{
    id: string;
    agreementId: string;
    milestoneId?: string;
    requestedByRole: TimelineActorRole;
    title: string;
    description: string;
    amount: Prisma.Decimal;
    currency: string;
    status: string;
    paymentStatus: PaymentStatus;
    createdAt: Date;
  }>;
  timelineEvents: Array<{
    id: string;
    agreementId: string;
    milestoneId?: string;
    actorRole: TimelineActorRole;
    actorId?: string;
    type: string;
    title: string;
    description: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
  }>;
}

export function buildEmptyFreelancerScenario(): TestScenarioFixture {
  const freelancerId = 'freelancer-empty-1';
  return {
    name: 'empty-freelancer',
    freelancers: [
      {
        id: freelancerId,
        email: 'empty@example.com',
        name: 'Empty Freelancer',
      },
    ],
    agreements: [],
    milestones: [],
    payments: [],
    deliveries: [],
    aiReviews: [],
    changeRequests: [],
    timelineEvents: [],
  };
}

export function buildMixedStatusesScenario(): TestScenarioFixture {
  const freelancerId = 'freelancer-mixed-1';
  const clientId = 'client-mixed-1';
  const now = new Date('2026-04-29T12:00:00.000Z');
  const yesterday = new Date('2026-04-28T12:00:00.000Z');

  return {
    name: 'mixed-statuses',
    freelancers: [
      {
        id: freelancerId,
        email: 'mixed@example.com',
        name: 'Mixed Freelancer',
      },
    ],
    agreements: [
      {
        id: 'agreement-mixed-1',
        freelancerId,
        clientId,
        title: 'Draft Agreement',
        description: 'Draft desc',
        serviceType: 'design',
        totalAmount: decimal('1000.00'),
        currency: 'USD',
        status: AgreementStatus.DRAFT,
        createdAt: now,
      },
      {
        id: 'agreement-mixed-2',
        freelancerId,
        clientId,
        title: 'Sent Agreement',
        description: 'Sent desc',
        serviceType: 'dev',
        totalAmount: decimal('2000.00'),
        currency: 'USD',
        status: AgreementStatus.SENT,
        createdAt: now,
      },
      {
        id: 'agreement-mixed-3',
        freelancerId,
        clientId,
        title: 'Active Agreement',
        description: 'Active desc',
        serviceType: 'qa',
        totalAmount: decimal('3000.00'),
        currency: 'SAR',
        status: AgreementStatus.ACTIVE,
        createdAt: now,
      },
      {
        id: 'agreement-mixed-4',
        freelancerId,
        clientId,
        title: 'Disputed Agreement',
        description: 'Disputed desc',
        serviceType: 'consulting',
        totalAmount: decimal('4000.00'),
        currency: 'USD',
        status: AgreementStatus.DISPUTED,
        createdAt: now,
      },
    ],
    milestones: [
      {
        id: 'milestone-mixed-1',
        agreementId: 'agreement-mixed-3',
        title: 'Milestone 1',
        amount: decimal('1500.00'),
        currency: 'SAR',
        order: 1,
        status: 'ACTIVE',
        paymentStatus: PaymentStatus.RESERVED,
        deliveryStatus: DeliveryStatus.IN_REVIEW,
        createdAt: now,
      },
      {
        id: 'milestone-mixed-2',
        agreementId: 'agreement-mixed-3',
        title: 'Milestone 2',
        amount: decimal('1500.00'),
        currency: 'SAR',
        order: 2,
        status: 'IN_REVIEW',
        paymentStatus: PaymentStatus.READY_TO_RELEASE,
        deliveryStatus: DeliveryStatus.CHANGES_REQUESTED,
        createdAt: now,
      },
      {
        id: 'milestone-mixed-3',
        agreementId: 'agreement-mixed-1',
        title: 'Milestone 3',
        amount: decimal('500.00'),
        currency: 'USD',
        order: 1,
        status: 'DRAFT',
        paymentStatus: PaymentStatus.WAITING,
        deliveryStatus: DeliveryStatus.SUBMITTED,
        createdAt: now,
      },
      {
        id: 'milestone-mixed-4',
        agreementId: 'agreement-mixed-4',
        title: 'Milestone 4',
        amount: decimal('2000.00'),
        currency: 'USD',
        order: 1,
        status: 'CHANGES_REQUESTED',
        paymentStatus: PaymentStatus.ON_HOLD,
        deliveryStatus: DeliveryStatus.ACCEPTED,
        createdAt: now,
      },
    ],
    payments: [
      {
        id: 'payment-mixed-1',
        agreementId: 'agreement-mixed-3',
        amount: decimal('1250.5555'),
        currency: 'SAR',
        status: PaymentStatus.RESERVED,
        operationType: 'FUND_MILESTONE',
        demoMode: true,
        createdAt: now,
      },
      {
        id: 'payment-mixed-2',
        agreementId: 'agreement-mixed-3',
        amount: decimal('750.00'),
        currency: 'SAR',
        status: PaymentStatus.RELEASED,
        operationType: 'RELEASE_MILESTONE',
        demoMode: true,
        createdAt: now,
      },
      {
        id: 'payment-mixed-3',
        agreementId: 'agreement-mixed-1',
        amount: decimal('0.001'),
        currency: 'USD',
        status: PaymentStatus.WAITING,
        operationType: 'FUND_MILESTONE',
        demoMode: true,
        createdAt: now,
      },
      {
        id: 'payment-mixed-4',
        agreementId: 'agreement-mixed-4',
        amount: decimal('999999.99'),
        currency: 'USD',
        status: PaymentStatus.ON_HOLD,
        operationType: 'CHANGE_REQUEST_PAYMENT',
        demoMode: true,
        createdAt: now,
      },
    ],
    deliveries: [
      {
        id: 'delivery-mixed-1',
        agreementId: 'agreement-mixed-3',
        milestoneId: 'milestone-mixed-2',
        submittedById: freelancerId,
        summary: 'Delivery summary 1',
        status: DeliveryStatus.CHANGES_REQUESTED,
        submittedAt: now,
        createdAt: now,
      },
      {
        id: 'delivery-mixed-2',
        agreementId: 'agreement-mixed-3',
        milestoneId: 'milestone-mixed-1',
        submittedById: freelancerId,
        summary: 'Delivery summary 2',
        status: DeliveryStatus.IN_REVIEW,
        submittedAt: yesterday,
        createdAt: yesterday,
      },
    ],
    aiReviews: [
      {
        id: 'ai-review-mixed-1',
        agreementId: 'agreement-mixed-3',
        milestoneId: 'milestone-mixed-2',
        requestedByRole: TimelineActorRole.CLIENT,
        objection: 'Quality concerns',
        status: 'COMPLETED',
        recommendation: 'NEEDS_HUMAN_REVIEW',
        createdAt: now,
      },
      {
        id: 'ai-review-mixed-2',
        agreementId: 'agreement-mixed-1',
        milestoneId: 'milestone-mixed-3',
        requestedByRole: TimelineActorRole.FREELANCER,
        objection: 'Scope mismatch',
        status: 'PENDING',
        recommendation: 'ACCEPT',
        createdAt: yesterday,
      },
    ],
    changeRequests: [
      {
        id: 'change-mixed-1',
        agreementId: 'agreement-mixed-3',
        milestoneId: 'milestone-mixed-2',
        requestedByRole: TimelineActorRole.CLIENT,
        title: 'Change request 1',
        description: 'Description 1',
        amount: decimal('300.50'),
        currency: 'SAR',
        status: 'PENDING',
        paymentStatus: PaymentStatus.WAITING,
        createdAt: now,
      },
      {
        id: 'change-mixed-2',
        agreementId: 'agreement-mixed-4',
        requestedByRole: TimelineActorRole.CLIENT,
        title: 'Change request 2',
        description: 'Description 2',
        amount: decimal('500.00'),
        currency: 'USD',
        status: 'APPROVED',
        paymentStatus: PaymentStatus.RESERVED,
        createdAt: yesterday,
      },
    ],
    timelineEvents: [
      {
        id: 'event-mixed-1',
        agreementId: 'agreement-mixed-3',
        actorRole: TimelineActorRole.FREELANCER,
        type: 'AGREEMENT_CREATED',
        title: 'Agreement created',
        description: 'Created',
        createdAt: yesterday,
      },
      {
        id: 'event-mixed-2',
        agreementId: 'agreement-mixed-3',
        milestoneId: 'milestone-mixed-1',
        actorRole: TimelineActorRole.FREELANCER,
        type: 'MILESTONE_CREATED',
        title: 'Milestone created',
        description: 'Milestone 1 created',
        createdAt: yesterday,
      },
      {
        id: 'event-mixed-3',
        agreementId: 'agreement-mixed-3',
        milestoneId: 'milestone-mixed-1',
        actorRole: TimelineActorRole.CLIENT,
        type: 'PAYMENT_RESERVED',
        title: 'Payment reserved',
        description: 'Payment reserved',
        createdAt: now,
      },
      {
        id: 'event-mixed-4',
        agreementId: 'agreement-mixed-3',
        milestoneId: 'milestone-mixed-2',
        actorRole: TimelineActorRole.FREELANCER,
        type: 'DELIVERY_SUBMITTED',
        title: 'Delivery submitted',
        description: 'Delivery submitted',
        createdAt: now,
      },
      {
        id: 'event-mixed-5',
        agreementId: 'agreement-mixed-1',
        actorRole: TimelineActorRole.FREELANCER,
        type: 'AGREEMENT_CREATED',
        title: 'Agreement created',
        description: 'Created',
        createdAt: yesterday,
      },
      {
        id: 'event-mixed-6',
        agreementId: 'agreement-mixed-4',
        actorRole: TimelineActorRole.CLIENT,
        type: 'CHANGE_REQUEST_CREATED',
        title: 'Change request created',
        description: 'Change request created',
        createdAt: now,
      },
      {
        id: 'event-mixed-7',
        agreementId: 'agreement-mixed-3',
        actorRole: TimelineActorRole.CLIENT,
        type: 'AI_REVIEW_COMPLETED',
        title: 'AI review completed',
        description: 'AI review completed',
        createdAt: now,
      },
      {
        id: 'event-mixed-8',
        agreementId: 'agreement-mixed-3',
        actorRole: TimelineActorRole.FREELANCER,
        type: 'PAYMENT_RELEASED',
        title: 'Payment released',
        description: 'Payment released',
        createdAt: yesterday,
      },
    ],
  };
}

export function buildTwoFreelancersOverlapScenario(): TestScenarioFixture {
  const freelancerA = 'freelancer-a-1';
  const freelancerB = 'freelancer-b-1';
  const clientId = 'client-overlap-1';
  const now = new Date('2026-04-29T12:00:00.000Z');

  return {
    name: 'two-freelancers-overlap',
    freelancers: [
      { id: freelancerA, email: 'a@example.com', name: 'Freelancer A' },
      { id: freelancerB, email: 'b@example.com', name: 'Freelancer B' },
    ],
    agreements: [
      {
        id: '8d1a58a2-e89f-4a21-9b6e-becce6a1e980',
        freelancerId: freelancerA,
        clientId,
        title: 'A Agreement 1',
        description: 'A desc',
        serviceType: 'design',
        totalAmount: decimal('1000.00'),
        currency: 'USD',
        status: AgreementStatus.ACTIVE,
        createdAt: now,
      },
      {
        id: '8d1a58a2-e89f-4a21-9b6e-becce6a1e981',
        freelancerId: freelancerA,
        clientId,
        title: 'A Agreement 2',
        description: 'A desc 2',
        serviceType: 'dev',
        totalAmount: decimal('2000.00'),
        currency: 'USD',
        status: AgreementStatus.COMPLETED,
        createdAt: now,
      },
      {
        id: '8d1a58a2-e89f-4a21-9b6e-becce6a1e982',
        freelancerId: freelancerB,
        clientId,
        title: 'B Agreement 1',
        description: 'B desc',
        serviceType: 'design',
        totalAmount: decimal('1500.00'),
        currency: 'SAR',
        status: AgreementStatus.ACTIVE,
        createdAt: now,
      },
      {
        id: '8d1a58a2-e89f-4a21-9b6e-becce6a1e983',
        freelancerId: freelancerB,
        clientId,
        title: 'B Agreement 2',
        description: 'B desc 2',
        serviceType: 'qa',
        totalAmount: decimal('2500.00'),
        currency: 'SAR',
        status: AgreementStatus.DRAFT,
        createdAt: now,
      },
    ],
    milestones: [],
    payments: [
      {
        id: 'payment-a-1',
        agreementId: 'agreement-a-1',
        amount: decimal('500.00'),
        currency: 'USD',
        status: PaymentStatus.READY_TO_RELEASE,
        operationType: 'FUND_MILESTONE',
        demoMode: true,
        createdAt: now,
      },
      {
        id: 'payment-b-1',
        agreementId: 'agreement-b-1',
        amount: decimal('750.00'),
        currency: 'SAR',
        status: PaymentStatus.READY_TO_RELEASE,
        operationType: 'FUND_MILESTONE',
        demoMode: true,
        createdAt: now,
      },
    ],
    deliveries: [
      {
        id: 'delivery-a-1',
        agreementId: 'agreement-a-1',
        milestoneId: 'milestone-a-1',
        submittedById: freelancerA,
        summary: 'A delivery',
        status: DeliveryStatus.CHANGES_REQUESTED,
        submittedAt: now,
        createdAt: now,
      },
      {
        id: 'delivery-b-1',
        agreementId: 'agreement-b-1',
        milestoneId: 'milestone-b-1',
        submittedById: freelancerB,
        summary: 'B delivery',
        status: DeliveryStatus.CHANGES_REQUESTED,
        submittedAt: now,
        createdAt: now,
      },
    ],
    aiReviews: [],
    changeRequests: [],
    timelineEvents: [
      {
        id: 'event-a-1',
        agreementId: 'agreement-a-1',
        actorRole: TimelineActorRole.FREELANCER,
        type: 'AGREEMENT_CREATED',
        title: 'A created',
        description: 'A created',
        createdAt: now,
      },
      {
        id: 'event-b-1',
        agreementId: 'agreement-b-1',
        actorRole: TimelineActorRole.FREELANCER,
        type: 'AGREEMENT_CREATED',
        title: 'B created',
        description: 'B created',
        createdAt: now,
      },
    ],
  };
}

export function withFreelancerCls<T>(
  userId: string,
  locale: Locale,
  fn: (cls: ClsService) => T,
): T {
  const cls = createDashboardClsMock({ userId, locale });
  return fn(cls);
}

export function createDashboardClsMock(
  overrides: Partial<{
    userId: string | undefined;
    requestId: string;
    correlationId: string;
    locale: Locale;
    actorType: ActorType;
    userRole: UserRole;
  }> = {},
): ClsService {
  const context = {
    userId: 'freelancer-1',
    requestId: 'req-test',
    correlationId: 'corr-test',
    locale: Locale.EN,
    actorType: ActorType.FREELANCER,
    userRole: UserRole.FREELANCER,
    ...overrides,
  };

  return {
    get: jest.fn((key: keyof typeof context) => context[key]),
  } as unknown as ClsService;
}

export function createDashboardPrismaMock(): PrismaService {
  return {
    agreement: {
      groupBy: jest.fn(),
      findFirst: jest.fn(),
    },
    payment: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    client: {
      count: jest.fn(),
    },
    delivery: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    aIReview: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    changeRequest: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    timelineEvent: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;
}

export function createDashboardService(options?: {
  prisma?: PrismaService;
  cls?: ClsService;
}): {
  service: DashboardAnalyticsService;
  prisma: PrismaService;
  cls: ClsService;
} {
  const prisma = options?.prisma ?? createDashboardPrismaMock();
  const cls = options?.cls ?? createDashboardClsMock();

  return {
    service: new DashboardAnalyticsService(prisma, cls),
    prisma,
    cls,
  };
}
