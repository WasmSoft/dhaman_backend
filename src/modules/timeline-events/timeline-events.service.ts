import {
  TimelineActorRole,
  TimelineEventType,
  type Prisma,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { ClsService } from '../../common/cls/cls.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { TimelineQueryDto } from './dto/timeline-events.dto';

type TransactionClient = Prisma.TransactionClient;

export type CreateTimelineEventInput = {
  actorId?: string;
  actorRole: TimelineActorRole;
  agreementId: string;
  description: string;
  metadata?: Record<string, unknown>;
  milestoneId?: string;
  title: string;
  type: TimelineEventType;
};

/**
 * Module responsibility:
 * - Provide ordered timeline views for agreement activity.
 * Main entities touched:
 * - TimelineEvent, Agreement, Milestone.
 * Expected endpoints:
 * - GET /agreements/:agreementId/timeline
 * Business rules:
 * - Maintain chronological integrity and actor attribution.
 * - Support agreement-level filtering with optional milestone context.
 * Implementation phases:
 * - Phase 3.
 * - Phase 4 milestone event creation support.
 * Error cases to document:
 * - AGREEMENT_NOT_FOUND.
 * Testing cases to cover:
 * - agreement timeline fetch, milestone filtering, ordering.
 */
@Injectable()
export class TimelineEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clsService: ClsService,
  ) {}

  // AR: يضيف حدثًا زمنيًا داخل نفس معاملة النطاق الذي أنشأ الحدث للحفاظ على الأثر.
  // EN: Appends a timeline event inside the producing domain transaction to keep the audit trail consistent.
  async createEvent(input: CreateTimelineEventInput, tx?: TransactionClient) {
    const client = tx ?? this.prisma;
    const actorId = input.actorId ?? this.clsService.get('userId');

    return client.timelineEvent.create({
      data: {
        actorId: actorId ?? null,
        actorRole: input.actorRole,
        agreementId: input.agreementId,
        description: input.description,
        metadata: this.buildMetadata(input, actorId),
        milestoneId: input.milestoneId ?? null,
        title: input.title,
        type: input.type,
      },
    });
  }

  // AR: يعيد الاستجابة المؤقتة لقراءة خط الأحداث إلى أن تكتمل مرحلة واجهة القراءة.
  // EN: Returns the placeholder timeline read response until the timeline read phase is implemented.
  listByAgreementId(agreementId: string, query: TimelineQueryDto) {
    return {
      module: 'timeline-events',
      action: 'listByAgreementId',
      phase: 0,
      status: 'not-implemented',
      agreementId,
      query,
    };
  }

  // AR: يسجل حدث طلب مراجعة الذكاء الاصطناعي مع بيانات الفاعل والمرجع.
  // EN: Records the AI review requested event with actor and reference metadata.
  async recordAiReviewRequested(
    input: {
      agreementId: string;
      milestoneId: string;
      deliveryId: string;
      paymentId: string;
      aiReviewId: string;
      actorRole: TimelineActorRole;
      actorId?: string;
      relatedCriteria: string[];
      milestoneTitle: string;
    },
    tx?: TransactionClient,
  ): Promise<void> {
    await this.createEvent(
      {
        agreementId: input.agreementId,
        milestoneId: input.milestoneId,
        actorRole: input.actorRole,
        actorId: input.actorId,
        type: TimelineEventType.AI_REVIEW_REQUESTED,
        title: 'AI review requested',
        description: `AI review requested for ${input.milestoneTitle}.`,
        metadata: {
          aiReviewId: input.aiReviewId,
          deliveryId: input.deliveryId,
          paymentId: input.paymentId,
          relatedCriteria: input.relatedCriteria,
        },
      },
      tx,
    );
  }

  // AR: يسجل حدث اكتمال مراجعة الذكاء الاصطناعي مع ملخص النتيجة.
  // EN: Records the AI review completed event with a result summary.
  async recordAiReviewCompleted(
    input: {
      agreementId: string;
      milestoneId: string;
      deliveryId: string;
      paymentId: string;
      aiReviewId: string;
      matchScore: number;
      recommendation: string;
    },
    tx?: TransactionClient,
  ): Promise<void> {
    await this.createEvent(
      {
        agreementId: input.agreementId,
        milestoneId: input.milestoneId,
        actorRole: TimelineActorRole.AI,
        type: TimelineEventType.AI_REVIEW_COMPLETED,
        title: 'AI review completed',
        description: `AI review completed with ${input.recommendation} recommendation.`,
        metadata: {
          aiReviewId: input.aiReviewId,
          deliveryId: input.deliveryId,
          paymentId: input.paymentId,
          matchScore: input.matchScore,
          recommendation: input.recommendation,
        },
      },
      tx,
    );
  }

  // AR: يسجل حدث قبول التوصية من مراجعة الذكاء الاصطناعي.
  // EN: Records the AI review recommendation accepted event by the freelancer.
  async recordAiReviewRecommendationAccepted(
    input: {
      agreementId: string;
      milestoneId: string;
      deliveryId: string;
      paymentId: string;
      aiReviewId: string;
      recommendation: string;
      actorId: string;
    },
    tx?: TransactionClient,
  ): Promise<void> {
    await this.createEvent(
      {
        agreementId: input.agreementId,
        milestoneId: input.milestoneId,
        actorRole: TimelineActorRole.FREELANCER,
        actorId: input.actorId,
        type: TimelineEventType.AI_REVIEW_RECOMMENDATION_ACCEPTED,
        title: 'AI recommendation accepted',
        description: `Freelancer accepted the AI ${input.recommendation} recommendation.`,
        metadata: {
          aiReviewId: input.aiReviewId,
          deliveryId: input.deliveryId,
          paymentId: input.paymentId,
          recommendation: input.recommendation,
        },
      },
      tx,
    );
  }

  private buildMetadata(
    input: CreateTimelineEventInput,
    actorId?: string,
  ): Prisma.InputJsonObject {
    const context = this.clsService.getContext();

    return this.withoutUndefined({
      ...input.metadata,
      actorId,
      actorRole: input.actorRole,
      agreementId: input.agreementId,
      correlationId: context?.correlationId,
      milestoneId: input.milestoneId,
      requestId: context?.requestId,
    });
  }

  private withoutUndefined(
    metadata: Record<string, unknown>,
  ): Prisma.InputJsonObject {
    return Object.fromEntries(
      Object.entries(metadata).filter(([, value]) => value !== undefined),
    ) as Prisma.InputJsonObject;
  }
}
