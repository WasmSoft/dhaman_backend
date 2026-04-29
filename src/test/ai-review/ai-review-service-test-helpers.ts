import {
  AIRecommendation,
  AIReviewStatus,
  PaymentStatus,
  Prisma,
  TimelineActorRole,
} from '@prisma/client';
import { ClsService } from '../../common/cls/cls.service';
import { Locale } from '../../common/enums/locale.enum';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { EmailNotificationsService } from '../../modules/email-notifications/email-notifications.service';
import { AiReviewService } from '../../modules/ai-review/ai-review.service';
import { GeminiService } from '../../modules/ai-review/gemini.service';
import { PaymentsService } from '../../modules/payments/payments.service';
import { TimelineEventsService } from '../../modules/timeline-events/timeline-events.service';

export const NOW = new Date('2026-04-29T12:00:00.000Z');
export const REVIEW_OBJECTION =
  'The mobile delivery misses two agreed acceptance criteria and needs review.';

export function createPrismaMock(): PrismaService {
  const prisma = {
    agreement: { findFirst: jest.fn() },
    delivery: { findUnique: jest.fn(), findFirst: jest.fn() },
    payment: { findFirst: jest.fn(), update: jest.fn() },
    milestone: { update: jest.fn() },
    aIReview: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    timelineEvent: { create: jest.fn() },
    emailNotification: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation(async (callback) => callback(prisma));

  return prisma as unknown as PrismaService;
}

export function createClsMock(locale = Locale.EN): ClsService {
  return {
    get: jest.fn((key: string) => (key === 'locale' ? locale : undefined)),
  } as unknown as ClsService;
}

export function createGeminiServiceMock(): GeminiService {
  return {
    generateContent: jest.fn(),
  } as unknown as GeminiService;
}

export function createService(
  locale = Locale.EN,
  geminiService?: GeminiService,
): {
  service: AiReviewService;
  prisma: PrismaService;
  paymentsService: PaymentsService;
  timelineEventsService: TimelineEventsService;
  emailNotificationsService: EmailNotificationsService;
  geminiService: GeminiService;
} {
  const prisma = createPrismaMock();
  const cls = createClsMock(locale);
  const timelineEventsService = new TimelineEventsService(prisma, cls);
  const paymentsService = new PaymentsService(prisma, timelineEventsService, cls);
  const emailNotificationsService = new EmailNotificationsService(prisma);
  const mockGeminiService = geminiService ?? createGeminiServiceMock();

  return {
    service: new AiReviewService(
      prisma,
      cls,
      paymentsService,
      timelineEventsService,
      emailNotificationsService,
      mockGeminiService,
    ),
    prisma,
    paymentsService,
    timelineEventsService,
    emailNotificationsService,
    geminiService: mockGeminiService,
  };
}

export function createDeliveryFixture() {
  return {
    id: 'delivery-1',
    agreementId: 'agreement-1',
    milestoneId: 'milestone-1',
    deliveryUrl: 'https://example.test/delivery',
    fileUrl: null,
    fileName: null,
    fileType: null,
    summary: 'Responsive landing page delivery',
    notes: 'Delivered homepage and mobile layout.',
    agreement: {
      title: 'Landing page redesign',
      description: 'Build a responsive landing page.',
      serviceType: 'web-design',
      currency: 'USD',
      freelancer: {
        id: 'freelancer-1',
        email: 'freelancer@example.com',
      },
      client: {
        id: 'client-1',
        email: 'client@example.com',
      },
      policy: {
        delayPolicy: 'Delay policy',
        cancellationPolicy: 'Cancellation policy',
        extraRequestPolicy: 'Extra request policy',
        reviewPolicy: 'Review policy',
        clientReviewPeriodDays: 5,
        freelancerDelayGraceDays: 2,
      },
    },
    milestone: {
      title: 'Homepage milestone',
      description: 'Homepage and mobile work',
      amount: new Prisma.Decimal('1200.00'),
      currency: 'USD',
      acceptanceCriteria: [
        'Responsive layout',
        'Brand colors',
        'Portfolio section',
        'Contact form',
        'Performance budget',
      ],
      revisionLimit: 2,
    },
  };
}

export function createReviewRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'review-1',
    agreementId: 'agreement-1',
    milestoneId: 'milestone-1',
    deliveryId: 'delivery-1',
    requestedByRole: TimelineActorRole.CLIENT,
    objection: REVIEW_OBJECTION,
    relatedCriteria: ['Contact form'],
    status: AIReviewStatus.PENDING,
    matchScore: null,
    recommendation: AIRecommendation.NEEDS_HUMAN_REVIEW,
    reasoning: null,
    completedCriteria: null,
    missingCriteria: null,
    outOfScopeItems: null,
    rawResponse: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export const REVIEW_PAYMENT_DTO = {
  agreementId: 'agreement-1',
  milestoneId: 'milestone-1',
  deliveryId: 'delivery-1',
  objection: REVIEW_OBJECTION,
  relatedCriteria: ['Contact form'],
};

export function mockSuccessfulOpenReview(prisma: PrismaService) {
  (prisma.delivery.findUnique as jest.Mock).mockResolvedValue(createDeliveryFixture());
  (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
    id: 'payment-1',
    status: PaymentStatus.CLIENT_REVIEW,
  });
  (prisma.aIReview.findFirst as jest.Mock).mockResolvedValue(null);
  (prisma.aIReview.create as jest.Mock).mockResolvedValue(createReviewRecord());
  (prisma.aIReview.update as jest.Mock)
    .mockResolvedValueOnce(
      createReviewRecord({ status: AIReviewStatus.PROCESSING }),
    )
    .mockImplementationOnce(({ data }) =>
      Promise.resolve(
        createReviewRecord({
          ...data,
          status: AIReviewStatus.COMPLETED,
          recommendation: data.recommendation,
        }),
      ),
    );
}
