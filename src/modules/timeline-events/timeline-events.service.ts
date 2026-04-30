import {
  TimelineActorRole,
  TimelineEventType,
  type Prisma,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { ClsService } from '../../common/cls/cls.service';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  PaginatedTimelineEventsResponseDto,
  TimelineEventResponseDto,
  TimelineQueryDto,
} from './dto/timeline-events.dto';

type TransactionClient = Prisma.TransactionClient;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const PORTAL_FORBIDDEN_METADATA_KEYS = new Set([
  'actorid',
  'correlationid',
  'credential',
  'hash',
  'internal',
  'password',
  'portaltoken',
  'portaltokenid',
  'prompt',
  'provider',
  'raw',
  'requestid',
  'secret',
  'token',
]);

type TimelineEventRow = {
  actor: { name: string } | null;
  actorRole: TimelineActorRole;
  agreementId: string;
  createdAt: Date;
  description: string;
  id: string;
  metadata: Prisma.JsonValue | null;
  milestoneId: string | null;
  title: string;
  type: TimelineEventType;
};

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

    this.validateEventType(input.type);
    this.validateMetadata(input.metadata);

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

  // AR: يعرض سجل الاتفاق للمالك المستقل فقط مع فلترة وصفحات محدودة.
  // EN: Lists an agreement timeline only for the owning freelancer with bounded filters and pagination.
  async listByAgreementId(
    agreementId: string,
    query: TimelineQueryDto,
    userId?: string,
  ): Promise<PaginatedTimelineEventsResponseDto> {
    const freelancerId = userId ?? this.clsService.get('userId');

    if (!freelancerId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    const agreement = await this.prisma.agreement.findFirst({
      where: { id: agreementId, freelancerId },
      select: { id: true },
    });

    if (!agreement) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }

    return this.listEvents({ agreementId }, query, false);
  }

  // AR: يعرض سجل البوابة ضمن الاتفاق المرتبط بالرمز فقط مع بيانات آمنة للعميل.
  // EN: Lists portal timeline events only for the token agreement with client-safe metadata.
  async listByPortalToken(
    rawToken: string,
    query: TimelineQueryDto,
  ): Promise<PaginatedTimelineEventsResponseDto> {
    const portalToken = await this.prisma.portalToken.findUnique({
      where: { tokenHash: createHash('sha256').update(rawToken).digest('hex') },
      select: {
        agreementId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!portalToken?.agreementId) {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    }

    if (portalToken.revokedAt) {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_REVOKED });
    }

    if (portalToken.expiresAt && portalToken.expiresAt < new Date()) {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_EXPIRED });
    }

    return this.listEvents(
      { agreementId: portalToken.agreementId },
      query,
      true,
    );
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
      actorId,
      actorRole: input.actorRole,
      agreementId: input.agreementId,
      correlationId: context?.correlationId,
      milestoneId: input.milestoneId,
      requestId: context?.requestId,
      ...input.metadata,
    });
  }

  private withoutUndefined(
    metadata: Record<string, unknown>,
  ): Prisma.InputJsonObject {
    return Object.fromEntries(
      Object.entries(metadata).filter(
        ([, value]) => value !== undefined && value !== '',
      ),
    ) as Prisma.InputJsonObject;
  }

  private async listEvents(
    baseWhere: Prisma.TimelineEventWhereInput,
    query: TimelineQueryDto,
    portalSafe: boolean,
  ): Promise<PaginatedTimelineEventsResponseDto> {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const where = this.buildTimelineWhere(baseWhere, query);

    const [events, total] = await this.prisma.$transaction([
      this.prisma.timelineEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          actor: { select: { name: true } },
          actorRole: true,
          agreementId: true,
          createdAt: true,
          description: true,
          id: true,
          metadata: true,
          milestoneId: true,
          title: true,
          type: true,
        },
      }),
      this.prisma.timelineEvent.count({ where }),
    ]);

    return {
      items: events.map((event) => this.toResponseDto(event, portalSafe)),
      page,
      limit,
      total,
      hasNextPage: page * limit < total,
    };
  }

  private buildTimelineWhere(
    baseWhere: Prisma.TimelineEventWhereInput,
    query: TimelineQueryDto,
  ): Prisma.TimelineEventWhereInput {
    this.validateDateRange(query);

    return {
      ...baseWhere,
      ...(query.actorRole ? { actorRole: query.actorRole } : {}),
      ...(query.milestoneId ? { milestoneId: query.milestoneId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
  }

  // AR: يتحقق من أن نطاق التاريخ غير معكوس قبل متابعة الاستعلام.
  // EN: Validates that the date range is not reversed before proceeding with the query.
  private validateDateRange(query: TimelineQueryDto): void {
    if (
      query.from &&
      query.to &&
      new Date(query.from) > new Date(query.to)
    ) {
      throw new AppException({ code: ErrorCode.VALIDATION_ERROR });
    }
  }

  private toResponseDto(
    event: TimelineEventRow,
    portalSafe: boolean,
  ): TimelineEventResponseDto {
    return {
      id: event.id,
      agreementId: event.agreementId,
      milestoneId: event.milestoneId,
      actorRole: event.actorRole,
      actorName: event.actor?.name,
      type: event.type,
      title: event.title,
      description: event.description,
      metadata: this.toMetadataResponse(event.metadata, portalSafe),
      createdAt: event.createdAt.toISOString(),
    };
  }

  private toMetadataResponse(
    metadata: Prisma.JsonValue | null,
    portalSafe: boolean,
  ): Record<string, unknown> | null {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }

    const record = metadata as Record<string, unknown>;

    if (!portalSafe) {
      return record;
    }

    return this.filterPortalMetadata(record);
  }

  private filterPortalMetadata(
    metadata: Record<string, unknown>,
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(metadata)
        .filter(([key]) => !this.isPortalForbiddenMetadataKey(key))
        .map(([key, value]) => [key, this.filterPortalMetadataValue(value)]),
    );
  }

  private filterPortalMetadataValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.filterPortalMetadataValue(item));
    }

    if (value && typeof value === 'object') {
      return this.filterPortalMetadata(value as Record<string, unknown>);
    }

    return value;
  }

  private isPortalForbiddenMetadataKey(key: string): boolean {
    return PORTAL_FORBIDDEN_METADATA_KEYS.has(key.toLowerCase());
  }

  // AR: يتحقق من أن نوع الحدث الزمني معتمد من بين الأنواع المدعومة.
  // EN: Validates that the timeline event type is among the approved supported types.
  private validateEventType(type: string): void {
    const approvedTypes: Set<string> = new Set(
      Object.values(TimelineEventType),
    );

    if (!approvedTypes.has(type)) {
      throw new AppException({ code: ErrorCode.TIMELINE_EVENT_TYPE_INVALID });
    }
  }

  // AR: يتحقق من سلامة البيانات الوصفية ويرفض المفاتيح المحظورة بشكل متكرر.
  // EN: Validates metadata safety and recursively rejects forbidden metadata keys.
  private validateMetadata(metadata: unknown): void {
    if (metadata === undefined || metadata === null) {
      return;
    }

    if (typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw new AppException({ code: ErrorCode.TIMELINE_METADATA_INVALID });
    }

    this.checkForbiddenMetadataKeys(metadata as Record<string, unknown>);
  }

  // AR: يتحقق من وجود مفاتيح محظورة بشكل متكرر داخل كائنات وقيم مصفوفات البيانات الوصفية.
  // EN: Recursively checks for forbidden metadata keys inside objects and array values.
  private checkForbiddenMetadataKeys(
    obj: Record<string, unknown>,
  ): void {
    for (const key of Object.keys(obj)) {
      if (this.isPortalForbiddenMetadataKey(key)) {
        throw new AppException({ code: ErrorCode.TIMELINE_METADATA_INVALID });
      }

      const value = obj[key];

      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === 'object' && !Array.isArray(item)) {
              this.checkForbiddenMetadataKeys(item as Record<string, unknown>);
            }
          }
        } else {
          this.checkForbiddenMetadataKeys(value as Record<string, unknown>);
        }
      }
    }
  }
}
