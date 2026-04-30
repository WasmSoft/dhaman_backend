import {
  AIRecommendation,
  AIReviewStatus,
  PaymentStatus,
  Prisma,
  TimelineActorRole,
  TimelineEventType,
} from '@prisma/client';
import { ClsService } from '../../common/cls/cls.service';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { Locale } from '../../common/enums/locale.enum';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { EmailNotificationsService } from '../../modules/email-notifications/email-notifications.service';
import { AiReviewService } from '../../modules/ai-review/ai-review.service';
import { AiReviewResponseDto } from '../../modules/ai-review/dto';
import { GeminiService } from '../../modules/ai-review/gemini.service';
import { PaymentsService } from '../../modules/payments/payments.service';
import { TimelineEventsService } from '../../modules/timeline-events/timeline-events.service';

const NOW = new Date('2026-04-29T12:00:00.000Z');
const REVIEW_OBJECTION =
  'The mobile delivery misses two agreed acceptance criteria and needs review.';

function createPrismaMock(): PrismaService {
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

function createClsMock(locale = Locale.EN): ClsService {
  return {
    get: jest.fn((key: string) => (key === 'locale' ? locale : undefined)),
  } as unknown as ClsService;
}

function createGeminiServiceMock(): GeminiService {
  return {
    generateContent: jest.fn().mockResolvedValue(
      JSON.stringify({
        matchScore: 72,
        recommendation: 'PARTIAL',
        completedCriteria: [
          'Responsive layout',
          'Brand colors',
          'Portfolio section',
        ],
        missingCriteria: ['Contact form', 'Performance budget'],
        outOfScopeItems: [
          'Additional out-of-scope item identified by the mock review.',
        ],
        reasoning:
          'The delivery meets part of the acceptance criteria, but some items still need completion before full acceptance.',
      }),
    ),
  } as unknown as GeminiService;
}

function createService(locale = Locale.EN): {
  service: AiReviewService;
  prisma: PrismaService;
  geminiService: GeminiService;
} {
  const prisma = createPrismaMock();
  const cls = createClsMock(locale);
  const paymentsService = new PaymentsService(prisma);
  const timelineEventsService = new TimelineEventsService(prisma);
  const emailNotificationsService = new EmailNotificationsService(prisma);
  const geminiService = createGeminiServiceMock();

  return {
    service: new AiReviewService(
      prisma,
      cls,
      paymentsService,
      timelineEventsService,
      emailNotificationsService,
      geminiService,
    ),
    prisma,
    geminiService,
  };
}

function createDeliveryFixture() {
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

function createReviewRecord(overrides: Record<string, unknown> = {}) {
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

const REVIEW_PAYMENT_DTO = {
  agreementId: 'agreement-1',
  milestoneId: 'milestone-1',
  deliveryId: 'delivery-1',
  objection: REVIEW_OBJECTION,
  relatedCriteria: ['Contact form'],
};

describe('AiReviewService Phase 3 open-review flow', () => {
  it('opens a review, moves payment to AI_REVIEW, stores mock result, and creates timeline events', async () => {
    const { service, prisma } = createService(Locale.EN);
    const delivery = createDeliveryFixture();

    (prisma.delivery.findUnique as jest.Mock).mockResolvedValue(delivery);
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.CLIENT_REVIEW,
    });
    (prisma.aIReview.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.aIReview.create as jest.Mock).mockResolvedValue(
      createReviewRecord(),
    );
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

    const result = await service.openReview(
      'delivery-1',
      {
        objection: REVIEW_OBJECTION,
        relatedCriteria: ['Contact form'],
      },
      TimelineActorRole.CLIENT,
      'portal-token-1',
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 'review-1',
        status: AIReviewStatus.COMPLETED,
        matchScore: 72,
        recommendation: AIRecommendation.PARTIAL,
        completedCriteria: [
          'Responsive layout',
          'Brand colors',
          'Portfolio section',
        ],
        missingCriteria: ['Contact form', 'Performance budget'],
      }),
    );
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: { status: PaymentStatus.AI_REVIEW },
    });
    expect(prisma.milestone.update).toHaveBeenCalledWith({
      where: { id: 'milestone-1' },
      data: { paymentStatus: PaymentStatus.AI_REVIEW },
    });
    expect((prisma.aIReview.create as jest.Mock).mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        deliveryId: 'delivery-1',
        status: AIReviewStatus.PENDING,
        recommendation: AIRecommendation.NEEDS_HUMAN_REVIEW,
      }),
    );
    expect((prisma.aIReview.update as jest.Mock).mock.calls[1][0].data).toEqual(
      expect.objectContaining({
        status: AIReviewStatus.COMPLETED,
        matchScore: 72,
        recommendation: AIRecommendation.PARTIAL,
      }),
    );
    expect(
      (prisma.timelineEvent.create as jest.Mock).mock.calls.map(
        ([call]) => call.data.type,
      ),
    ).toEqual([
      TimelineEventType.AI_REVIEW_REQUESTED,
      TimelineEventType.AI_REVIEW_COMPLETED,
    ]);
    expect(prisma.emailNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agreementId: 'agreement-1',
        recipientEmail: 'freelancer@example.com',
      }),
    });
    expect(
      (prisma.timelineEvent.create as jest.Mock).mock.calls[0][0].data,
    ).toEqual(
      expect.objectContaining({
        actorRole: TimelineActorRole.CLIENT,
        metadata: expect.objectContaining({ actorId: 'portal-token-1' }),
      }),
    );
  });

  it('rejects missing deliveries before creating a review', async () => {
    const { service, prisma } = createService();
    (prisma.delivery.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.openReview(
        'missing-delivery',
        { objection: REVIEW_OBJECTION },
        TimelineActorRole.CLIENT,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.DELIVERY_NOT_FOUND });
    expect(prisma.aIReview.create).not.toHaveBeenCalled();
  });

  it('prevents a second pending, processing, or completed review for the same delivery', async () => {
    const { service, prisma } = createService();
    (prisma.delivery.findUnique as jest.Mock).mockResolvedValue(
      createDeliveryFixture(),
    );
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.CLIENT_REVIEW,
    });
    (prisma.aIReview.findFirst as jest.Mock).mockResolvedValue({
      id: 'review-existing',
      status: AIReviewStatus.PROCESSING,
    });

    await expect(
      service.openReview(
        'delivery-1',
        { objection: REVIEW_OBJECTION },
        TimelineActorRole.CLIENT,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.AI_REVIEW_ALREADY_COMPLETED });
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it('rejects non-reviewable payment states before transitioning payment', async () => {
    const { service, prisma } = createService();
    (prisma.delivery.findUnique as jest.Mock).mockResolvedValue(
      createDeliveryFixture(),
    );
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.RELEASED,
    });

    await expect(
      service.openReview(
        'delivery-1',
        { objection: REVIEW_OBJECTION },
        TimelineActorRole.CLIENT,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_READY_TO_RELEASE });
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });
});

describe('AiReviewService Gemini retry and fallback', () => {
  it('retries once then uses real result when Gemini first fails then succeeds', async () => {
    const { service, prisma, geminiService } = createService(Locale.EN);
    const delivery = createDeliveryFixture();

    (geminiService.generateContent as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(
        JSON.stringify({
          matchScore: 85,
          recommendation: 'ACCEPT',
          completedCriteria: [
            'Responsive layout',
            'Brand colors',
            'Portfolio section',
            'Contact form',
            'Performance budget',
          ],
          missingCriteria: [],
          outOfScopeItems: [],
          reasoning: 'All criteria are fully met on second attempt.',
        }),
      );

    (prisma.delivery.findUnique as jest.Mock).mockResolvedValue(delivery);
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.CLIENT_REVIEW,
    });
    (prisma.aIReview.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.aIReview.create as jest.Mock).mockResolvedValue(
      createReviewRecord(),
    );
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

    const result = await service.openReview(
      'delivery-1',
      { objection: REVIEW_OBJECTION, relatedCriteria: ['Contact form'] },
      TimelineActorRole.CLIENT,
      'portal-token-1',
    );

    expect(result).toEqual(
      expect.objectContaining({
        status: AIReviewStatus.COMPLETED,
        matchScore: 85,
        recommendation: AIRecommendation.ACCEPT,
      }),
    );
    expect(geminiService.generateContent).toHaveBeenCalledTimes(2);
  });

  it('falls back to mock when Gemini fails twice and completes review', async () => {
    const { service, prisma, geminiService } = createService(Locale.EN);
    const delivery = createDeliveryFixture();

    (geminiService.generateContent as jest.Mock).mockRejectedValue(
      new Error('AI service unavailable'),
    );

    (prisma.delivery.findUnique as jest.Mock).mockResolvedValue(delivery);
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.CLIENT_REVIEW,
    });
    (prisma.aIReview.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.aIReview.create as jest.Mock).mockResolvedValue(
      createReviewRecord(),
    );
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

    const result = await service.openReview(
      'delivery-1',
      { objection: REVIEW_OBJECTION, relatedCriteria: ['Contact form'] },
      TimelineActorRole.CLIENT,
      'portal-token-1',
    );

    expect(result).toEqual(
      expect.objectContaining({
        status: AIReviewStatus.COMPLETED,
        matchScore: 72,
        recommendation: AIRecommendation.PARTIAL,
      }),
    );
    expect(geminiService.generateContent).toHaveBeenCalledTimes(2);
  });
});

describe('AiReviewService locale-specific prompts', () => {
  it('passes Arabic prompt for locale ar to GeminiService', async () => {
    const { service, prisma, geminiService } = createService(Locale.AR);
    const delivery = createDeliveryFixture();

    (prisma.delivery.findUnique as jest.Mock).mockResolvedValue(delivery);
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.CLIENT_REVIEW,
    });
    (prisma.aIReview.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.aIReview.create as jest.Mock).mockResolvedValue(
      createReviewRecord(),
    );
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

    await service.openReview(
      'delivery-1',
      { objection: REVIEW_OBJECTION },
      TimelineActorRole.CLIENT,
    );

    expect(geminiService.generateContent).toHaveBeenCalledWith(
      expect.stringContaining('Write the reasoning text in Arabic.'),
    );
  });

  it('passes English prompt for locale en to GeminiService', async () => {
    const { service, prisma, geminiService } = createService(Locale.EN);
    const delivery = createDeliveryFixture();

    (prisma.delivery.findUnique as jest.Mock).mockResolvedValue(delivery);
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.CLIENT_REVIEW,
    });
    (prisma.aIReview.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.aIReview.create as jest.Mock).mockResolvedValue(
      createReviewRecord(),
    );
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

    await service.openReview(
      'delivery-1',
      { objection: REVIEW_OBJECTION },
      TimelineActorRole.CLIENT,
    );

    expect(geminiService.generateContent).toHaveBeenCalledWith(
      expect.stringContaining('Write the reasoning text in English.'),
    );
  });
});

describe('AiReviewService reviewPaymentRelease', () => {
  it('verifies freelancer ownership and delegates to openReview with FREELANCER actor context', async () => {
    const { service, prisma } = createService();
    const response: AiReviewResponseDto = {
      id: 'review-1',
      agreementId: 'agreement-1',
      milestoneId: 'milestone-1',
      deliveryId: 'delivery-1',
      status: AIReviewStatus.COMPLETED,
      matchScore: 72,
      recommendation: AIRecommendation.PARTIAL,
      reasoning: 'Mock reasoning',
      completedCriteria: [],
      missingCriteria: [],
      outOfScopeItems: [],
      objection: REVIEW_OBJECTION,
      requestedByRole: TimelineActorRole.FREELANCER,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const openReview = jest
      .spyOn(service, 'openReview')
      .mockResolvedValue(response);

    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue({
      id: 'agreement-1',
    });
    (prisma.delivery.findFirst as jest.Mock).mockResolvedValue({
      id: 'delivery-1',
    });

    await expect(
      service.reviewPaymentRelease(REVIEW_PAYMENT_DTO, 'freelancer-1'),
    ).resolves.toBe(response);
    expect(openReview).toHaveBeenCalledWith(
      'delivery-1',
      {
        objection: REVIEW_OBJECTION,
        relatedCriteria: ['Contact form'],
      },
      TimelineActorRole.FREELANCER,
      'freelancer-1',
    );
  });

  it('rejects freelancer reviews for agreements the user does not own', async () => {
    const { service, prisma } = createService();
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.reviewPaymentRelease(REVIEW_PAYMENT_DTO, 'freelancer-1'),
    ).rejects.toMatchObject({ code: ErrorCode.UNAUTHORIZED });
  });

  it('rejects freelancer reviews when the delivery does not match the requested agreement and milestone', async () => {
    const { service, prisma } = createService();
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue({
      id: 'agreement-1',
    });
    (prisma.delivery.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.reviewPaymentRelease(REVIEW_PAYMENT_DTO, 'freelancer-1'),
    ).rejects.toMatchObject({ code: ErrorCode.DELIVERY_NOT_FOUND });
  });
});
