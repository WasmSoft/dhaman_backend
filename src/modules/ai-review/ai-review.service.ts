import { Injectable } from '@nestjs/common';
import {
  AIRecommendation,
  AIReviewStatus,
  ChangeRequestStatus,
  PaymentStatus,
  Prisma,
  TimelineActorRole,
  TimelineEventType,
} from '@prisma/client';
import { ClsService } from '../../common/cls/cls.service';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { Locale } from '../../common/enums/locale.enum';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { TimelineEventsService } from '../timeline-events/timeline-events.service';
import { GeminiService } from './gemini.service';
import {
  AcceptRecommendationDto,
  AcceptRecommendationResponseDto,
  AiReviewListResponseDto,
  AiReviewResponseDto,
  GetAiReviewsQueryDto,
  OpenAiReviewDto,
  ReviewPaymentReleaseDto,
} from './dto';
import {
  buildReviewContext,
  buildReviewPrompt,
  generateMockReview,
  parseReviewResponse,
  type ReviewLocale,
  type ReviewResult,
} from './helpers';

const DUPLICATE_BLOCKING_STATUSES = [
  AIReviewStatus.PENDING,
  AIReviewStatus.PROCESSING,
  AIReviewStatus.COMPLETED,
];

const AI_REVIEW_SELECT = {
  id: true,
  agreementId: true,
  milestoneId: true,
  deliveryId: true,
  requestedByRole: true,
  objection: true,
  relatedCriteria: true,
  status: true,
  matchScore: true,
  recommendation: true,
  reasoning: true,
  completedCriteria: true,
  missingCriteria: true,
  outOfScopeItems: true,
  createdAt: true,
  updatedAt: true,
} as const;

type AiReviewRecord = {
  id: string;
  agreementId: string;
  milestoneId: string;
  deliveryId: string | null;
  requestedByRole: TimelineActorRole;
  objection: string;
  relatedCriteria: Prisma.JsonValue | null;
  status: AIReviewStatus;
  matchScore: number | null;
  recommendation: AIRecommendation | null;
  reasoning: string | null;
  completedCriteria: Prisma.JsonValue | null;
  missingCriteria: Prisma.JsonValue | null;
  outOfScopeItems: Prisma.JsonValue | null;
  rawResponse: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

type ReviewDeliveryRecord = {
  id: string;
  agreementId: string;
  milestoneId: string;
  deliveryUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  summary: string;
  notes: string | null;
  agreement: {
    freelancer: {
      id: string;
      email: string;
    };
    client: {
      id: string;
      email: string;
    };
    title: string;
    description: string;
    serviceType: string;
    currency: string;
    policy: {
      delayPolicy: string;
      cancellationPolicy: string;
      extraRequestPolicy: string;
      reviewPolicy: string;
      clientReviewPeriodDays: number;
      freelancerDelayGraceDays: number;
    } | null;
  };
  milestone: {
    title: string;
    description: string | null;
    amount: Prisma.Decimal | string | number;
    currency: string;
    acceptanceCriteria: Prisma.JsonValue;
    revisionLimit: number;
  };
};

/**
 * Module responsibility:
 * - Orchestrate AI review requests and recommendation acceptance flow.
 * Main entities touched:
 * - AIReview, Agreement, Milestone, Delivery, Payment, and timeline records.
 * Phase 3 service entry points:
 * - openReview(deliveryId, dto, actorRole, actorId?)
 * - reviewPaymentRelease(dto, userId)
 * Business rules:
 * - Prevent duplicate active/completed review flows per delivery.
 * - Move the milestone payment to AI_REVIEW before mock analysis.
 * - Preserve internal raw mock response for auditability without exposing it.
 * Implementation phase:
 * - AI Review module Phase 3.
 * Error cases to document:
 * - DELIVERY_NOT_FOUND, PAYMENT_NOT_FOUND, PAYMENT_NOT_READY_TO_RELEASE,
 *   AI_REVIEW_FAILED, AI_REVIEW_ALREADY_COMPLETED, UNAUTHORIZED.
 * Testing cases to cover:
 * - open review, duplicate prevention, payment-state validation, freelancer ownership.
 */
@Injectable()
export class AiReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clsService: ClsService,
    private readonly paymentsService: PaymentsService,
    private readonly timelineEventsService: TimelineEventsService,
    private readonly emailNotificationsService: EmailNotificationsService,
    private readonly geminiService: GeminiService,
  ) {}

  // AR: ينشئ مراجعة ذكاء اصطناعي للتسليم ويعالجها بالمزوّد التجريبي الآمن.
  // EN: Opens and processes an AI review for a delivery using the safe mock provider.
  async openReview(
    deliveryId: string,
    dto: OpenAiReviewDto,
    actorRole: TimelineActorRole,
    actorId?: string,
  ): Promise<AiReviewResponseDto> {
    const delivery = await this.getDeliveryForReview(deliveryId);
    await this.ensureNoBlockingReview(delivery.id);

    const context = buildReviewContext({
      agreement: delivery.agreement,
      milestone: delivery.milestone,
      delivery,
      objection: dto.objection,
      relatedCriteria: dto.relatedCriteria,
      locale: this.getReviewLocale(),
    });

    const processingReview = await this.prisma.$transaction(async (tx) => {
      const review = await tx.aIReview.create({
        data: {
          agreementId: delivery.agreementId,
          milestoneId: delivery.milestoneId,
          deliveryId: delivery.id,
          requestedByRole: actorRole,
          objection: dto.objection,
          relatedCriteria: dto.relatedCriteria ?? undefined,
          status: AIReviewStatus.PENDING,
          recommendation: AIRecommendation.NEEDS_HUMAN_REVIEW,
        },
      });

      const paymentTransition =
        await this.paymentsService.transitionMilestonePaymentToAiReview(
          {
            agreementId: delivery.agreementId,
            milestoneId: delivery.milestoneId,
            deliveryId: delivery.id,
          },
          tx,
        );

      await this.timelineEventsService.recordAiReviewRequested(
        {
          agreementId: delivery.agreementId,
          milestoneId: delivery.milestoneId,
          deliveryId: delivery.id,
          paymentId: paymentTransition.paymentId,
          aiReviewId: review.id,
          actorRole,
          actorId,
          relatedCriteria: dto.relatedCriteria ?? [],
          milestoneTitle: delivery.milestone.title,
        },
        tx,
      );

      const processingState = await tx.aIReview.update({
        where: { id: review.id },
        data: { status: AIReviewStatus.PROCESSING },
      });

      return {
        review: processingState,
        paymentId: paymentTransition.paymentId,
      };
    });

    const { result, rawResponse } = await this.tryRealProviderWithFallback(
      processingReview.review.id,
      context,
    );

    const completedReview = await this.prisma.$transaction(async (tx) => {
      const review = await tx.aIReview.update({
        where: { id: processingReview.review.id },
        data: {
          status: AIReviewStatus.COMPLETED,
          matchScore: result.matchScore,
          recommendation: result.recommendation as AIRecommendation,
          reasoning: result.reasoning,
          completedCriteria: result.completedCriteria,
          missingCriteria: result.missingCriteria,
          outOfScopeItems: result.outOfScopeItems,
          rawResponse,
        },
      });

      await this.timelineEventsService.recordAiReviewCompleted(
        {
          agreementId: delivery.agreementId,
          milestoneId: delivery.milestoneId,
          deliveryId: delivery.id,
          paymentId: processingReview.paymentId,
          aiReviewId: review.id,
          matchScore: result.matchScore,
          recommendation: result.recommendation,
        },
        tx,
      );

      return review;
    });

    if (actorRole === TimelineActorRole.CLIENT) {
      await this.emailNotificationsService.enqueueAiReviewOpenedForFreelancer({
        agreementId: delivery.agreementId,
        recipientEmail: delivery.agreement.freelancer.email,
        aiReviewId: completedReview.id,
        deliveryId: delivery.id,
        milestoneId: delivery.milestoneId,
      });
    }

    return this.toResponse(completedReview);
  }

  // AR: يتحقق من ملكية المستقل ثم يفتح مراجعة ذكاء اصطناعي استباقية للتسليم.
  // EN: Verifies freelancer ownership, then opens a proactive AI review for the delivery.
  async reviewPaymentRelease(
    dto: ReviewPaymentReleaseDto,
    userId: string,
  ): Promise<AiReviewResponseDto> {
    if (!userId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    const agreement = await this.prisma.agreement.findFirst({
      where: {
        id: dto.agreementId,
        freelancerId: userId,
      },
      select: { id: true },
    });

    if (!agreement) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    const delivery = await this.prisma.delivery.findFirst({
      where: {
        id: dto.deliveryId,
        agreementId: dto.agreementId,
        milestoneId: dto.milestoneId,
      },
      select: { id: true },
    });

    if (!delivery) {
      throw new AppException({ code: ErrorCode.DELIVERY_NOT_FOUND });
    }

    return this.openReview(
      dto.deliveryId,
      {
        objection: dto.objection,
        relatedCriteria: dto.relatedCriteria,
      },
      TimelineActorRole.FREELANCER,
      userId,
    );
  }

  async findAll(
    userId: string,
    query: GetAiReviewsQueryDto,
  ): Promise<AiReviewListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.AIReviewWhereInput = {
      agreement: { freelancerId: userId },
      ...(query.agreementId && { agreementId: query.agreementId }),
      ...(query.status && { status: query.status }),
    };

    const [reviews, total] = await this.prisma.$transaction([
      this.prisma.aIReview.findMany({
        where,
        select: AI_REVIEW_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.aIReview.count({ where }),
    ]);

    return {
      reviews: reviews.map((review) =>
        this.toResponse(review as unknown as AiReviewRecord),
      ),
      total,
    };
  }

  async findOne(
    id: string,
    userId: string,
  ): Promise<AiReviewResponseDto> {
    const review = await this.prisma.aIReview.findFirst({
      where: {
        id,
        agreement: { freelancerId: userId },
      },
      select: AI_REVIEW_SELECT,
    });

    if (!review) {
      throw new AppException({ code: ErrorCode.AI_REVIEW_NOT_FOUND });
    }

    return this.toResponse(review as unknown as AiReviewRecord);
  }

  // AR: يقبل توصية مراجعة الذكاء الاصطناعي ويطبقها على الدفعة مع التأثيرات الجانبية.
  // EN: Accepts the AI review recommendation and applies it to the payment with side effects.
  async acceptRecommendation(
    id: string,
    dto: AcceptRecommendationDto,
    userId: string,
  ): Promise<AcceptRecommendationResponseDto> {
    const review = await this.prisma.aIReview.findUnique({
      where: { id },
      include: {
        agreement: {
          select: {
            freelancerId: true,
            currency: true,
            client: { select: { email: true } },
          },
        },
        milestone: { select: { title: true, id: true } },
      },
    });

    if (!review) {
      throw new AppException({ code: ErrorCode.AI_REVIEW_NOT_FOUND });
    }

    if (review.status !== AIReviewStatus.COMPLETED || review.recommendation === null) {
      throw new AppException({ code: ErrorCode.AI_REVIEW_NOT_FOUND });
    }

    if (review.agreement.freelancerId !== userId) {
      throw new AppException({ code: ErrorCode.AI_REVIEW_NOT_FOUND });
    }

    const existingEvent = await this.prisma.timelineEvent.findFirst({
      where: {
        type: TimelineEventType.AI_REVIEW_RECOMMENDATION_ACCEPTED,
        metadata: { path: ['aiReviewId'], equals: id },
      },
    });

    if (existingEvent) {
      throw new AppException({ code: ErrorCode.AI_REVIEW_ALREADY_COMPLETED });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const paymentTransition =
        await this.paymentsService.transitionPaymentFromAiReviewToOutcome(
          {
            agreementId: review.agreementId,
            milestoneId: review.milestoneId,
          },
          review.recommendation,
          tx,
        );

      await this.timelineEventsService.recordAiReviewRecommendationAccepted(
        {
          agreementId: review.agreementId,
          milestoneId: review.milestoneId,
          deliveryId: review.deliveryId ?? '',
          paymentId: paymentTransition.paymentId,
          aiReviewId: id,
          recommendation: review.recommendation,
          actorId: userId,
        },
        tx,
      );

      let changeRequestsCreated = 0;
      const outOfScopeItems = this.toStringArray(review.outOfScopeItems);

      if (
        dto.createChangeRequests === true &&
        Array.isArray(outOfScopeItems) &&
        outOfScopeItems.length > 0
      ) {
        await tx.changeRequest.createMany({
          data: outOfScopeItems.map((item) => ({
            agreementId: review.agreementId,
            milestoneId: review.milestoneId,
            requestedByRole: TimelineActorRole.FREELANCER,
            title: item.slice(0, 160),
            description: item,
            amount: new Prisma.Decimal(0),
            currency: review.agreement.currency,
            acceptanceCriteria: {},
            status: ChangeRequestStatus.PENDING,
            paymentStatus: PaymentStatus.WAITING,
          })),
        });
        changeRequestsCreated = outOfScopeItems.length;
      }

      return {
        paymentStatus: paymentTransition.newStatus,
        changeRequestsCreated,
      };
    });

    await this.emailNotificationsService.enqueueAiReviewRecommendationAcceptedForClient({
      agreementId: review.agreementId,
      recipientEmail: review.agreement.client.email,
      recommendation: review.recommendation,
      paymentStatus: result.paymentStatus,
    });

    return {
      review: this.toResponse(review as unknown as AiReviewRecord),
      paymentStatus: result.paymentStatus,
      changeRequestsCreated: result.changeRequestsCreated,
    };
  }

  private async getDeliveryForReview(
    deliveryId: string,
  ): Promise<ReviewDeliveryRecord> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        agreement: {
          include: {
            policy: true,
            freelancer: { select: { id: true, email: true } },
            client: { select: { id: true, email: true } },
          },
        },
        milestone: true,
      },
    });

    if (!delivery) {
      throw new AppException({ code: ErrorCode.DELIVERY_NOT_FOUND });
    }

    return delivery;
  }

  private async ensureNoBlockingReview(deliveryId: string): Promise<void> {
    const existingReview = await this.prisma.aIReview.findFirst({
      where: {
        deliveryId,
        status: { in: DUPLICATE_BLOCKING_STATUSES },
      },
      select: { id: true, status: true },
    });

    if (existingReview) {
      throw new AppException({
        code: ErrorCode.AI_REVIEW_ALREADY_COMPLETED,
        details: { reviewId: existingReview.id, status: existingReview.status },
      });
    }
  }

  private async tryRealProviderWithFallback(
    reviewId: string,
    context: Parameters<typeof generateMockReview>[0],
  ): Promise<{
    result: ReviewResult;
    rawResponse: Prisma.InputJsonObject;
  }> {
    const prompt = buildReviewPrompt(context);

    const geminiResult = await this.tryRealProvider(prompt);

    if (geminiResult) {
      return {
        result: geminiResult,
        rawResponse: {
          provider: 'gemini',
          response: geminiResult,
        },
      };
    }

    return this.runMockFallback(context, reviewId, 'ai_failure');
  }

  private async tryRealProvider(
    prompt: string,
  ): Promise<ReviewResult | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const rawText = await this.geminiService.generateContent(prompt);
        return parseReviewResponse(rawText);
      } catch {
        // continue to next attempt or return null
      }
    }

    return null;
  }

  private runMockFallback(
    context: Parameters<typeof generateMockReview>[0],
    reviewId: string,
    reason: string,
  ): {
    result: ReviewResult;
    rawResponse: Prisma.InputJsonObject;
  } {
    try {
      const rawText = JSON.stringify(generateMockReview(context));
      const result = parseReviewResponse(rawText);

      return {
        result,
        rawResponse: {
          provider: 'mock',
          reason,
          response: result,
        },
      };
    } catch (error) {
      this.markReviewFailed(reviewId, error).catch(() => {});
      throw new AppException({ code: ErrorCode.AI_REVIEW_FAILED });
    }
  }

  private async markReviewFailed(
    reviewId: string,
    error: unknown,
  ): Promise<void> {
    await this.prisma.aIReview.update({
      where: { id: reviewId },
      data: {
        status: AIReviewStatus.FAILED,
        rawResponse: {
          provider: 'mock',
          error: this.getSafeErrorName(error),
        },
      },
    });
  }

  private getSafeErrorName(error: unknown): string {
    if (error instanceof Error) {
      return error.name;
    }

    return 'UnknownError';
  }

  private getReviewLocale(): ReviewLocale {
    return this.clsService.get('locale') === Locale.EN ? 'en' : 'ar';
  }

  private toResponse(review: AiReviewRecord): AiReviewResponseDto {
    return {
      id: review.id,
      agreementId: review.agreementId,
      milestoneId: review.milestoneId,
      deliveryId: review.deliveryId ?? '',
      status: review.status,
      matchScore: review.matchScore,
      recommendation: review.recommendation,
      reasoning: review.reasoning,
      completedCriteria: this.toStringArray(review.completedCriteria),
      missingCriteria: this.toStringArray(review.missingCriteria),
      outOfScopeItems: this.toStringArray(review.outOfScopeItems),
      objection: review.objection,
      requestedByRole: review.requestedByRole,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  private toStringArray(value: Prisma.JsonValue | null): string[] | null {
    if (!Array.isArray(value)) {
      return null;
    }

    return value.filter((item): item is string => typeof item === 'string');
  }
}
