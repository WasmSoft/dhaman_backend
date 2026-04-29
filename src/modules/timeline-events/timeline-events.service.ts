import {
  TimelineActorRole,
  TimelineEventType,
  type Prisma,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { TimelineQueryDto } from './dto/timeline-events.dto';

type TimelineWriteClient = Pick<PrismaService | Prisma.TransactionClient, 'timelineEvent'>;

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
 * Error cases to document:
 * - AGREEMENT_NOT_FOUND.
 * Testing cases to cover:
 * - agreement timeline fetch, milestone filtering, ordering.
 */
@Injectable()
export class TimelineEventsService {
  constructor(private readonly prisma: PrismaService) {}

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
    tx?: TimelineWriteClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    await client.timelineEvent.create({
      data: {
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
          actorId: input.actorId ?? null,
          actorRole: input.actorRole,
          relatedCriteria: input.relatedCriteria,
        },
      },
    });
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
    tx?: TimelineWriteClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    await client.timelineEvent.create({
      data: {
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
    });
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
    tx?: TimelineWriteClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    await client.timelineEvent.create({
      data: {
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
          actorId: input.actorId,
        },
      },
    });
  }
}
