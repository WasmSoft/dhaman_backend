import { Test, TestingModule } from '@nestjs/testing';
import {
  AIRecommendation,
  AIReviewStatus,
  TimelineActorRole,
} from '@prisma/client';
import { AiReviewService } from './ai-review.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ClsService } from '../../common/cls/cls.service';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/errors/app-exception';
import { PaymentsService } from '../payments/payments.service';
import { TimelineEventsService } from '../timeline-events/timeline-events.service';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import { GeminiService } from './gemini.service';

type AiReviewSeed = {
  id: string;
  agreementId: string;
  milestoneId: string;
  deliveryId: string | null;
  requestedByRole: TimelineActorRole;
  objection: string;
  relatedCriteria: unknown;
  status: AIReviewStatus;
  matchScore: number | null;
  recommendation: AIRecommendation | null;
  reasoning: string | null;
  completedCriteria: unknown;
  missingCriteria: unknown;
  outOfScopeItems: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function createReview(overrides: Partial<AiReviewSeed> = {}): AiReviewSeed {
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
    recommendation: AIRecommendation.PARTIAL,
    reasoning: 'Test reasoning',
    completedCriteria: ['criteria-1'],
    missingCriteria: ['missing-1'],
    outOfScopeItems: ['out-of-scope-1'],
    createdAt: new Date('2026-04-29T10:00:00.000Z'),
    updatedAt: new Date('2026-04-29T11:00:00.000Z'),
    ...overrides,
  };
}

describe('AiReviewService — integration', () => {
  let service: AiReviewService;
  let prismaMock: {
    aIReview: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
    agreement: { findFirst: jest.Mock };
    delivery: { findUnique: jest.Mock; findFirst: jest.Mock };
    timelineEvent: { findFirst: jest.Mock };
    changeRequest: { createMany: jest.Mock };
  };

  beforeAll(async () => {
    prismaMock = {
      aIReview: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
      agreement: { findFirst: jest.fn() },
      delivery: { findUnique: jest.fn(), findFirst: jest.fn() },
      timelineEvent: { findFirst: jest.fn() },
      changeRequest: { createMany: jest.fn() },
    };

    const clsMock = {
      get: jest.fn().mockReturnValue('en'),
      setContext: jest.fn(),
    };

    const paymentsServiceMock = {
      transitionMilestonePaymentToAiReview: jest.fn(),
      transitionPaymentFromAiReviewToOutcome: jest.fn(),
    };

    const timelineEventsServiceMock = {
      recordAiReviewRequested: jest.fn(),
      recordAiReviewCompleted: jest.fn(),
      recordAiReviewRecommendationAccepted: jest.fn(),
    };

    const emailNotificationsServiceMock = {
      enqueueAiReviewOpenedForFreelancer: jest.fn(),
      enqueueAiReviewRecommendationAcceptedForClient: jest.fn(),
    };

    const geminiServiceMock = {
      generateContent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiReviewService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ClsService, useValue: clsMock },
        { provide: PaymentsService, useValue: paymentsServiceMock },
        { provide: TimelineEventsService, useValue: timelineEventsServiceMock },
        { provide: EmailNotificationsService, useValue: emailNotificationsServiceMock },
        { provide: GeminiService, useValue: geminiServiceMock },
      ],
    }).compile();

    service = module.get<AiReviewService>(AiReviewService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // US1: findAll()
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('T004: returns only reviews for authenticated user\'s agreements', async () => {
      const userAId = 'user-a';
      const reviewUserA = createReview({ id: 'review-a', agreementId: 'agreement-a' });

      prismaMock.$transaction.mockResolvedValue([[reviewUserA], 1]);

      const result = await service.findAll(userAId, {});

      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0].id).toBe('review-a');
      expect(result.total).toBe(1);
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);

      const transactionArgs = prismaMock.$transaction.mock.calls[0][0];
      expect(Array.isArray(transactionArgs)).toBe(true);
      expect(transactionArgs).toHaveLength(2);
    });

    it('T005: findAll filters by agreementId correctly', async () => {
      const userId = 'user-1';
      const agreement1Id = 'agreement-1';
      const review1 = createReview({ id: 'review-1', agreementId: agreement1Id });

      prismaMock.$transaction.mockResolvedValue([[review1], 1]);

      const result = await service.findAll(userId, { agreementId: agreement1Id });

      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0].agreementId).toBe(agreement1Id);
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it('T006: findAll unowned agreementId returns empty list', async () => {
      const userId = 'user-1';
      const otherAgreementId = 'other-agreement';

      prismaMock.$transaction.mockResolvedValue([[], 0]);

      const result = await service.findAll(userId, { agreementId: otherAgreementId });

      expect(result.reviews).toEqual([]);
      expect(result.total).toBe(0);
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it('T007: findAll status filter returns only matching status', async () => {
      const userId = 'user-1';
      const completedReview = createReview({ id: 'review-completed', status: AIReviewStatus.COMPLETED });

      prismaMock.$transaction.mockResolvedValue([[completedReview], 1]);

      const result = await service.findAll(userId, { status: AIReviewStatus.COMPLETED });

      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0].status).toBe(AIReviewStatus.COMPLETED);
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it('T008: findAll pagination returns correct slice and total', async () => {
      const userId = 'user-1';
      const reviews = Array.from({ length: 5 }, (_, i) =>
        createReview({ id: `review-${i + 1}` }),
      );
      const page2Slice = reviews.slice(2, 4);

      prismaMock.$transaction.mockResolvedValue([page2Slice, 5]);

      const result = await service.findAll(userId, { page: 2, limit: 2 });

      expect(result.reviews).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // US2: findOne()
  // ---------------------------------------------------------------------------
  describe('findOne', () => {
    it('T014: returns full review for owned record', async () => {
      const userId = 'user-1';
      const review = createReview({
        id: 'review-found',
        status: AIReviewStatus.COMPLETED,
      });

      prismaMock.aIReview.findFirst.mockResolvedValue(review);

      const result = await service.findOne(review.id, userId);

      expect(result.id).toBe(review.id);
      expect(result.matchScore).toBe(review.matchScore);
      expect(result.status).toBe(review.status);
      expect(result.recommendation).toBe(review.recommendation);
      expect(result.reasoning).toBe(review.reasoning);
      expect(result.completedCriteria).toEqual(['criteria-1']);
      expect(result.missingCriteria).toEqual(['missing-1']);
      expect(result.outOfScopeItems).toEqual(['out-of-scope-1']);
      expect((result as unknown as Record<string, unknown>).rawResponse).toBeUndefined();
      expect(prismaMock.aIReview.findFirst).toHaveBeenCalledTimes(1);
    });

    it('T015: returns 404 for non-existent ID', async () => {
      const userId = 'user-1';
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      prismaMock.aIReview.findFirst.mockResolvedValue(null);

      await expect(service.findOne(nonExistentId, userId)).rejects.toThrow(AppException);

      try {
        await service.findOne(nonExistentId, userId);
        fail('Expected AppException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AppException);
        expect((error as AppException).code).toBe(ErrorCode.AI_REVIEW_NOT_FOUND);
      }
    });

    it('T016: returns 404 for review owned by another user', async () => {
      const userAId = 'user-a';
      const userBId = 'user-b';
      const review = createReview({ id: 'review-owned-by-a', agreementId: 'agreement-a' });

      prismaMock.aIReview.findFirst.mockResolvedValue(null);

      await expect(service.findOne(review.id, userBId)).rejects.toThrow(AppException);

      try {
        await service.findOne(review.id, userBId);
        fail('Expected AppException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AppException);
        expect((error as AppException).code).toBe(ErrorCode.AI_REVIEW_NOT_FOUND);
      }
    });
  });
});
