import {
  AIRecommendation,
  AIReviewStatus,
  ChangeRequestStatus,
  NotificationStatus,
  NotificationType,
  PaymentStatus,
  TimelineActorRole,
  TimelineEventType,
} from '@prisma/client';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/errors/app-exception';
import { ClsService } from '../../common/cls/cls.service';
import { Locale } from '../../common/enums/locale.enum';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AiReviewService } from '../../modules/ai-review/ai-review.service';
import { GeminiService } from '../../modules/ai-review/gemini.service';
import { PaymentsService } from '../../modules/payments/payments.service';
import { TimelineEventsService } from '../../modules/timeline-events/timeline-events.service';
import { EmailNotificationsService } from '../../modules/email-notifications/email-notifications.service';

function createPrismaMock(): PrismaService {
  const prisma = {
    aIReview: { findUnique: jest.fn() },
    timelineEvent: { findFirst: jest.fn(), create: jest.fn() },
    changeRequest: { createMany: jest.fn() },
    payment: { findFirst: jest.fn(), update: jest.fn() },
    milestone: { update: jest.fn() },
    emailNotification: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
  prisma.payment.findFirst.mockResolvedValue({
    id: 'payment-1',
    status: PaymentStatus.AI_REVIEW,
  });

  return prisma as unknown as PrismaService;
}

function createGeminiServiceMock(): GeminiService {
  return {
    generateContent: jest.fn(),
  } as unknown as GeminiService;
}

function createService(): {
  service: AiReviewService;
  prisma: PrismaService;
  paymentsService: PaymentsService;
  timelineEventsService: TimelineEventsService;
  emailNotificationsService: EmailNotificationsService;
} {
  const prisma = createPrismaMock();
  const cls = {
    get: jest.fn((key: string) => (key === 'locale' ? Locale.EN : undefined)),
  } as unknown as ClsService;
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
    paymentsService,
    timelineEventsService,
    emailNotificationsService,
  };
}

function createCompletedReview(overrides: Record<string, unknown> = {}) {
  return {
    id: 'review-1',
    agreementId: 'agreement-1',
    milestoneId: 'milestone-1',
    deliveryId: 'delivery-1',
    requestedByRole: TimelineActorRole.CLIENT,
    objection: 'Test objection',
    relatedCriteria: null,
    status: AIReviewStatus.COMPLETED,
    matchScore: 72,
    recommendation: AIRecommendation.ACCEPT,
    reasoning: 'Mock reasoning',
    completedCriteria: null,
    missingCriteria: null,
    outOfScopeItems: null,
    rawResponse: null,
    createdAt: new Date('2026-04-29T12:00:00.000Z'),
    updatedAt: new Date('2026-04-29T12:00:00.000Z'),
    agreement: {
      freelancerId: 'freelancer-1',
      currency: 'USD',
      client: { email: 'client@example.com' },
    },
    milestone: {
      id: 'milestone-1',
      title: 'Homepage milestone',
    },
    ...overrides,
  };
}

describe('AiReviewService acceptRecommendation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recommendation maps to correct payment status', () => {
    it('ACCEPT -> READY_TO_RELEASE', async () => {
      const { service, prisma } = createService();
      (prisma.aIReview.findUnique as jest.Mock).mockResolvedValue(
        createCompletedReview({ recommendation: AIRecommendation.ACCEPT }),
      );
      (prisma.timelineEvent.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.acceptRecommendation(
        'review-1',
        { createChangeRequests: false },
        'freelancer-1',
      );

      expect(result.paymentStatus).toBe(PaymentStatus.READY_TO_RELEASE);
    });

    it('REJECT -> ON_HOLD', async () => {
      const { service, prisma } = createService();
      (prisma.aIReview.findUnique as jest.Mock).mockResolvedValue(
        createCompletedReview({ recommendation: AIRecommendation.REJECT }),
      );
      (prisma.timelineEvent.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.acceptRecommendation(
        'review-1',
        { createChangeRequests: false },
        'freelancer-1',
      );

      expect(result.paymentStatus).toBe(PaymentStatus.ON_HOLD);
    });

    it('PARTIAL -> ON_HOLD', async () => {
      const { service, prisma } = createService();
      (prisma.aIReview.findUnique as jest.Mock).mockResolvedValue(
        createCompletedReview({ recommendation: AIRecommendation.PARTIAL }),
      );
      (prisma.timelineEvent.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.acceptRecommendation(
        'review-1',
        { createChangeRequests: false },
        'freelancer-1',
      );

      expect(result.paymentStatus).toBe(PaymentStatus.ON_HOLD);
    });

    it('NEEDS_HUMAN_REVIEW -> no change (AI_REVIEW)', async () => {
      const { service, prisma } = createService();
      (prisma.aIReview.findUnique as jest.Mock).mockResolvedValue(
        createCompletedReview({
          recommendation: AIRecommendation.NEEDS_HUMAN_REVIEW,
        }),
      );
      (prisma.timelineEvent.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.acceptRecommendation(
        'review-1',
        { createChangeRequests: false },
        'freelancer-1',
      );

      expect(result.paymentStatus).toBe(PaymentStatus.AI_REVIEW);
    });
  });

  describe('acceptRecommendation ACCEPT transitions payment to READY_TO_RELEASE', () => {
    it('calls payment transition with correct arguments', async () => {
      const { service, prisma, paymentsService } = createService();
      (prisma.aIReview.findUnique as jest.Mock).mockResolvedValue(
        createCompletedReview({ recommendation: AIRecommendation.ACCEPT }),
      );
      (prisma.timelineEvent.findFirst as jest.Mock).mockResolvedValue(null);
      jest
        .spyOn(paymentsService, 'transitionPaymentFromAiReviewToOutcome')
        .mockResolvedValue({
          paymentId: 'payment-1',
          newStatus: PaymentStatus.READY_TO_RELEASE,
        });

      await service.acceptRecommendation(
        'review-1',
        { createChangeRequests: false },
        'freelancer-1',
      );

      expect(
        paymentsService.transitionPaymentFromAiReviewToOutcome,
      ).toHaveBeenCalledWith(
        { agreementId: 'agreement-1', milestoneId: 'milestone-1' },
        AIRecommendation.ACCEPT,
        expect.anything(),
      );
    });
  });

  describe('acceptRecommendation REJECT transitions payment to ON_HOLD', () => {
    it('calls payment transition with REJECT recommendation', async () => {
      const { service, prisma, paymentsService } = createService();
      (prisma.aIReview.findUnique as jest.Mock).mockResolvedValue(
        createCompletedReview({ recommendation: AIRecommendation.REJECT }),
      );
      (prisma.timelineEvent.findFirst as jest.Mock).mockResolvedValue(null);
      jest
        .spyOn(paymentsService, 'transitionPaymentFromAiReviewToOutcome')
        .mockResolvedValue({
          paymentId: 'payment-1',
          newStatus: PaymentStatus.ON_HOLD,
        });

      await service.acceptRecommendation(
        'review-1',
        { createChangeRequests: false },
        'freelancer-1',
      );

      expect(
        paymentsService.transitionPaymentFromAiReviewToOutcome,
      ).toHaveBeenCalledWith(
        { agreementId: 'agreement-1', milestoneId: 'milestone-1' },
        AIRecommendation.REJECT,
        expect.anything(),
      );
    });
  });

  describe('acceptRecommendation PARTIAL transitions payment to ON_HOLD', () => {
    it('calls payment transition with PARTIAL recommendation', async () => {
      const { service, prisma, paymentsService } = createService();
      (prisma.aIReview.findUnique as jest.Mock).mockResolvedValue(
        createCompletedReview({ recommendation: AIRecommendation.PARTIAL }),
      );
      (prisma.timelineEvent.findFirst as jest.Mock).mockResolvedValue(null);
      jest
        .spyOn(paymentsService, 'transitionPaymentFromAiReviewToOutcome')
        .mockResolvedValue({
          paymentId: 'payment-1',
          newStatus: PaymentStatus.ON_HOLD,
        });

      await service.acceptRecommendation(
        'review-1',
        { createChangeRequests: false },
        'freelancer-1',
      );

      expect(
        paymentsService.transitionPaymentFromAiReviewToOutcome,
      ).toHaveBeenCalledWith(
        { agreementId: 'agreement-1', milestoneId: 'milestone-1' },
        AIRecommendation.PARTIAL,
        expect.anything(),
      );
    });
  });

  describe('acceptRecommendation NEEDS_HUMAN_REVIEW does not change payment', () => {
    it('still calls payment transition but no DB update occurs', async () => {
      const { service, prisma, paymentsService } = createService();
      (prisma.aIReview.findUnique as jest.Mock).mockResolvedValue(
        createCompletedReview({
          recommendation: AIRecommendation.NEEDS_HUMAN_REVIEW,
        }),
      );
      (prisma.timelineEvent.findFirst as jest.Mock).mockResolvedValue(null);
      jest
        .spyOn(paymentsService, 'transitionPaymentFromAiReviewToOutcome')
        .mockResolvedValue({
          paymentId: 'payment-1',
          newStatus: PaymentStatus.AI_REVIEW,
        });

      const result = await service.acceptRecommendation(
        'review-1',
        { createChangeRequests: false },
        'freelancer-1',
      );

      expect(result.paymentStatus).toBe(PaymentStatus.AI_REVIEW);
      expect(
        paymentsService.transitionPaymentFromAiReviewToOutcome,
      ).toHaveBeenCalledWith(
        { agreementId: 'agreement-1', milestoneId: 'milestone-1' },
        AIRecommendation.NEEDS_HUMAN_REVIEW,
        expect.anything(),
      );
    });
  });

  describe('acceptRecommendation returns 409 on second call', () => {
    it('throws AI_REVIEW_ALREADY_COMPLETED when timeline event exists', async () => {
      const { service, prisma } = createService();
      (prisma.aIReview.findUnique as jest.Mock).mockResolvedValue(
        createCompletedReview(),
      );
      (prisma.timelineEvent.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
      });

      await expect(
        service.acceptRecommendation(
          'review-1',
          { createChangeRequests: false },
          'freelancer-1',
        ),
      ).rejects.toMatchObject({ code: ErrorCode.AI_REVIEW_ALREADY_COMPLETED });
    });
  });

  describe('acceptRecommendation returns 404 for review owned by another user', () => {
    it('throws AI_REVIEW_NOT_FOUND when freelancerId does not match', async () => {
      const { service, prisma } = createService();
      (prisma.aIReview.findUnique as jest.Mock).mockResolvedValue(
        createCompletedReview(),
      );

      await expect(
        service.acceptRecommendation(
          'review-1',
          { createChangeRequests: false },
          'other-freelancer',
        ),
      ).rejects.toMatchObject({ code: ErrorCode.AI_REVIEW_NOT_FOUND });
    });
  });

  describe('acceptRecommendation creates AI_REVIEW_RECOMMENDATION_ACCEPTED timeline event', () => {
    it('creates timeline event inside the transaction', async () => {
      const { service, prisma, timelineEventsService } = createService();
      (prisma.aIReview.findUnique as jest.Mock).mockResolvedValue(
        createCompletedReview({ recommendation: AIRecommendation.ACCEPT }),
      );
      (prisma.timelineEvent.findFirst as jest.Mock).mockResolvedValue(null);
      const recordSpy = jest
        .spyOn(timelineEventsService, 'recordAiReviewRecommendationAccepted')
        .mockResolvedValue(undefined);

      await service.acceptRecommendation(
        'review-1',
        { createChangeRequests: false },
        'freelancer-1',
      );

      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          agreementId: 'agreement-1',
          milestoneId: 'milestone-1',
          aiReviewId: 'review-1',
          recommendation: 'ACCEPT',
          actorId: 'freelancer-1',
        }),
        expect.anything(),
      );
    });
  });

  describe('createChangeRequests=true creates one CR per outOfScopeItem', () => {
    it('creates 2 ChangeRequests for 2 outOfScopeItems', async () => {
      const { service, prisma } = createService();
      (prisma.aIReview.findUnique as jest.Mock).mockResolvedValue(
        createCompletedReview({
          recommendation: AIRecommendation.PARTIAL,
          outOfScopeItems: [
            'Push notification integration',
            'Dark mode support',
          ],
        }),
      );
      (prisma.timelineEvent.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.acceptRecommendation(
        'review-1',
        { createChangeRequests: true },
        'freelancer-1',
      );

      expect(prisma.changeRequest.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            agreementId: 'agreement-1',
            milestoneId: 'milestone-1',
            requestedByRole: TimelineActorRole.FREELANCER,
            title: 'Push notification integration',
            description: 'Push notification integration',
            currency: 'USD',
            status: ChangeRequestStatus.PENDING,
            paymentStatus: PaymentStatus.WAITING,
          }),
          expect.objectContaining({
            agreementId: 'agreement-1',
            milestoneId: 'milestone-1',
            requestedByRole: TimelineActorRole.FREELANCER,
            title: 'Dark mode support',
            description: 'Dark mode support',
            currency: 'USD',
            status: ChangeRequestStatus.PENDING,
            paymentStatus: PaymentStatus.WAITING,
          }),
        ]),
      });
      expect(result.changeRequestsCreated).toBe(2);
    });
  });

  describe('createChangeRequests=false creates no CRs', () => {
    it('does not call changeRequest.createMany when flag is false', async () => {
      const { service, prisma } = createService();
      (prisma.aIReview.findUnique as jest.Mock).mockResolvedValue(
        createCompletedReview({
          recommendation: AIRecommendation.PARTIAL,
          outOfScopeItems: ['Push notification integration'],
        }),
      );
      (prisma.timelineEvent.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.acceptRecommendation(
        'review-1',
        { createChangeRequests: false },
        'freelancer-1',
      );

      expect(prisma.changeRequest.createMany).not.toHaveBeenCalled();
      expect(result.changeRequestsCreated).toBe(0);
    });
  });

  describe('createChangeRequests=true with empty outOfScopeItems creates no CRs', () => {
    it('does not call changeRequest.createMany when outOfScopeItems is empty', async () => {
      const { service, prisma } = createService();
      (prisma.aIReview.findUnique as jest.Mock).mockResolvedValue(
        createCompletedReview({
          recommendation: AIRecommendation.PARTIAL,
          outOfScopeItems: [],
        }),
      );
      (prisma.timelineEvent.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.acceptRecommendation(
        'review-1',
        { createChangeRequests: true },
        'freelancer-1',
      );

      expect(prisma.changeRequest.createMany).not.toHaveBeenCalled();
      expect(result.changeRequestsCreated).toBe(0);
    });
  });

  describe('acceptRecommendation enqueues client email notification', () => {
    it('creates email notification after transaction', async () => {
      const { service, prisma, emailNotificationsService } = createService();
      (prisma.aIReview.findUnique as jest.Mock).mockResolvedValue(
        createCompletedReview({ recommendation: AIRecommendation.ACCEPT }),
      );
      (prisma.timelineEvent.findFirst as jest.Mock).mockResolvedValue(null);
      const enqueueSpy = jest
        .spyOn(
          emailNotificationsService,
          'enqueueAiReviewRecommendationAcceptedForClient',
        )
        .mockResolvedValue(undefined);

      await service.acceptRecommendation(
        'review-1',
        { createChangeRequests: false },
        'freelancer-1',
      );

      expect(enqueueSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          agreementId: 'agreement-1',
          recipientEmail: 'client@example.com',
          recommendation: 'ACCEPT',
          paymentStatus: PaymentStatus.READY_TO_RELEASE,
        }),
      );
    });
  });

  describe('not-found guard cases', () => {
    it('throws AI_REVIEW_NOT_FOUND when review does not exist', async () => {
      const { service, prisma } = createService();
      (prisma.aIReview.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.acceptRecommendation(
          'review-1',
          { createChangeRequests: false },
          'freelancer-1',
        ),
      ).rejects.toMatchObject({ code: ErrorCode.AI_REVIEW_NOT_FOUND });
    });

    it('throws AI_REVIEW_NOT_FOUND when review status is not COMPLETED', async () => {
      const { service, prisma } = createService();
      (prisma.aIReview.findUnique as jest.Mock).mockResolvedValue(
        createCompletedReview({ status: AIReviewStatus.PROCESSING }),
      );

      await expect(
        service.acceptRecommendation(
          'review-1',
          { createChangeRequests: false },
          'freelancer-1',
        ),
      ).rejects.toMatchObject({ code: ErrorCode.AI_REVIEW_NOT_FOUND });
    });

    it('throws AI_REVIEW_NOT_FOUND when recommendation is null', async () => {
      const { service, prisma } = createService();
      (prisma.aIReview.findUnique as jest.Mock).mockResolvedValue(
        createCompletedReview({ recommendation: null }),
      );

      await expect(
        service.acceptRecommendation(
          'review-1',
          { createChangeRequests: false },
          'freelancer-1',
        ),
      ).rejects.toMatchObject({ code: ErrorCode.AI_REVIEW_NOT_FOUND });
    });
  });
});
