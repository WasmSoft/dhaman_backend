import {
  DeliveryStatus as PrismaDeliveryStatus,
  NotificationType,
  PaymentStatus as PrismaPaymentStatus,
  TimelineActorRole,
  TimelineEventType,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { PortalTokenType } from '../../common/enums/portal-token-type.enum';
import { AppException } from '../../common/errors/app-exception';
import { ClsService } from '../../common/cls/cls.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { TimelineEventsService } from '../timeline-events/timeline-events.service';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import {
  AcceptDeliveryDto,
  CreateDeliveryDto,
  DeliveryQueryDto,
  DeliveryListResponseDto,
  DeliveryResponseDto,
  RequestDeliveryChangesDto,
  SubmitDeliveryDto,
  UpdateDeliveryDto,
} from './dto';

const EDITABLE_DELIVERY_STATUSES: PrismaDeliveryStatus[] = [
  PrismaDeliveryStatus.DRAFT,
  PrismaDeliveryStatus.NOT_SUBMITTED,
  PrismaDeliveryStatus.CHANGES_REQUESTED,
];

const REVIEWABLE_DELIVERY_STATUSES: PrismaDeliveryStatus[] = [
  PrismaDeliveryStatus.SUBMITTED,
  PrismaDeliveryStatus.CLIENT_REVIEW,
  PrismaDeliveryStatus.IN_REVIEW,
];

const LOCKED_DELIVERY_STATUSES: PrismaDeliveryStatus[] = [
  PrismaDeliveryStatus.ACCEPTED,
  PrismaDeliveryStatus.DISPUTED,
];

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly timelineEventsService: TimelineEventsService,
    private readonly emailNotificationsService: EmailNotificationsService,
    private readonly clsService: ClsService,
  ) {}

  // ──────────────────────────────────────────────────────────
  //  UI 1 — Create, Update, Submit
  // ──────────────────────────────────────────────────────────

  async createDelivery(
    milestoneId: string,
    dto: CreateDeliveryDto,
  ): Promise<DeliveryResponseDto> {
    const userId = this.clsService.get('userId');
    if (!userId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    const milestone = await this.ensureOwnedMilestone(milestoneId, userId);

    const existingDraft = await this.prisma.delivery.findFirst({
      where: {
        milestoneId,
        status: { in: EDITABLE_DELIVERY_STATUSES },
      },
    });
    if (existingDraft) {
      throw new AppException({ code: ErrorCode.DELIVERY_ALREADY_EXISTS });
    }

    const delivery = await this.prisma.delivery.create({
      data: {
        agreementId: milestone.agreementId,
        milestoneId: milestone.id,
        submittedById: userId,
        deliveryUrl: dto.deliveryUrl ?? null,
        fileUrl: dto.fileUrl ?? null,
        fileName: dto.fileName ?? null,
        fileType: dto.fileType ?? null,
        summary: dto.summary,
        notes: dto.notes ?? null,
        status: PrismaDeliveryStatus.DRAFT,
      },
      include: {
        milestone: true,
      },
    });

    return this.toDeliveryResponse(delivery, milestone);
  }

  async updateDelivery(
    deliveryId: string,
    dto: UpdateDeliveryDto,
  ): Promise<DeliveryResponseDto> {
    const userId = this.clsService.get('userId');
    if (!userId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    const delivery = await this.ensureOwnedDelivery(deliveryId, userId);

    if (!this.isEditable(delivery.status)) {
      throw new AppException({ code: ErrorCode.DELIVERY_NOT_EDITABLE });
    }

    const updated = await this.prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        ...(dto.deliveryUrl !== undefined && { deliveryUrl: dto.deliveryUrl }),
        ...(dto.fileUrl !== undefined && { fileUrl: dto.fileUrl }),
        ...(dto.fileName !== undefined && { fileName: dto.fileName }),
        ...(dto.fileType !== undefined && { fileType: dto.fileType }),
        ...(dto.summary !== undefined && { summary: dto.summary }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: { milestone: true },
    });

    return this.toDeliveryResponse(updated, updated.milestone || undefined);
  }

  async submitDelivery(
    deliveryId: string,
    dto: SubmitDeliveryDto,
  ): Promise<DeliveryResponseDto> {
    const userId = this.clsService.get('userId');
    if (!userId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    const delivery = await this.ensureOwnedDelivery(deliveryId, userId);

    if (!this.isEditable(delivery.status)) {
      throw new AppException({ code: ErrorCode.DELIVERY_NOT_SUBMITTABLE });
    }

    const hasEvidence =
      !!delivery.deliveryUrl ||
      !!delivery.fileUrl ||
      (delivery.summary && delivery.summary.length >= 10);
    if (!hasEvidence) {
      throw new AppException({ code: ErrorCode.DELIVERY_EVIDENCE_REQUIRED });
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        milestoneId: delivery.milestoneId,
        status: PrismaPaymentStatus.RESERVED,
      },
    });
    if (!payment) {
      throw new AppException({ code: ErrorCode.PAYMENT_NOT_RESERVED });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          status: PrismaDeliveryStatus.SUBMITTED,
          submittedAt: dto.submittedAt ? new Date(dto.submittedAt) : new Date(),
        },
        include: { milestone: true },
      });

      await this.timelineEventsService.createEvent(
        {
          actorId: userId,
          actorRole: TimelineActorRole.FREELANCER,
          agreementId: delivery.agreementId,
          milestoneId: delivery.milestoneId,
          type: TimelineEventType.DELIVERY_SUBMITTED,
          title: 'Delivery Submitted',
          description: `Delivery submitted for milestone "${result.milestone?.title ?? ''}"`,
          metadata: {
            deliveryId: delivery.id,
            ...(dto.noteToClient && { noteToClient: dto.noteToClient }),
          },
        },
        tx,
      );

      try {
        await this.paymentsService.transitionToClientReview(
          payment.id,
          userId,
          TimelineActorRole.FREELANCER,
        );
      } catch (e) {
        throw new AppException({
          code: ErrorCode.PAYMENT_NOT_RESERVED,
          details: { originalError: String(e) },
        });
      }

      try {
        await this.emailNotificationsService.enqueueDeliverySubmittedForClient({
          agreementId: delivery.agreementId,
          deliveryId: delivery.id,
          milestoneId: delivery.milestoneId,
          milestoneTitle: result.milestone?.title ?? '',
        });
      } catch {
        // non-blocking per spec FR-015
      }

      return result;
    });

    return this.toDeliveryResponse(updated, updated.milestone || undefined);
  }

  // ──────────────────────────────────────────────────────────
  //  UI 2 — Portal Review
  // ──────────────────────────────────────────────────────────

  async acceptDeliveryFromPortal(
    token: string,
    deliveryId: string,
    dto?: AcceptDeliveryDto,
  ): Promise<DeliveryResponseDto> {
    const portalToken = await this.resolvePortalToken(token, deliveryId);

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { milestone: true },
    });
    if (!delivery) {
      throw new AppException({ code: ErrorCode.DELIVERY_NOT_FOUND });
    }

    if (!this.isReviewable(delivery.status)) {
      throw new AppException({ code: ErrorCode.DELIVERY_NOT_REVIEWABLE });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          status: PrismaDeliveryStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
        include: { milestone: true },
      });

      await this.timelineEventsService.createEvent(
        {
          actorId: portalToken.id,
          actorRole: TimelineActorRole.CLIENT,
          agreementId: delivery.agreementId,
          milestoneId: delivery.milestoneId,
          type: TimelineEventType.DELIVERY_ACCEPTED,
          title: 'Delivery Accepted',
          description: `Delivery accepted for milestone "${result.milestone?.title ?? ''}"`,
          metadata: {
            deliveryId: delivery.id,
            ...(dto?.note && { note: dto.note }),
          },
        },
        tx,
      );

      const payment = await tx.payment.findFirst({
        where: { milestoneId: delivery.milestoneId },
      });
      if (payment) {
        try {
          await this.paymentsService.transitionToReadyToRelease(
            payment.id,
            portalToken.id,
            TimelineActorRole.CLIENT,
          );
        } catch (e) {
          throw new AppException({
            code: ErrorCode.PAYMENT_NOT_FOUND,
            details: { originalError: String(e) },
          });
        }
      }

      return result;
    });

    return this.toDeliveryResponse(updated, updated.milestone || undefined);
  }

  async requestChangesFromPortal(
    token: string,
    deliveryId: string,
    dto: RequestDeliveryChangesDto,
  ): Promise<DeliveryResponseDto> {
    const portalToken = await this.resolvePortalToken(token, deliveryId);

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { milestone: true },
    });
    if (!delivery) {
      throw new AppException({ code: ErrorCode.DELIVERY_NOT_FOUND });
    }

    if (!this.isReviewable(delivery.status)) {
      throw new AppException({ code: ErrorCode.DELIVERY_NOT_REVIEWABLE });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          status: PrismaDeliveryStatus.CHANGES_REQUESTED,
          changesRequestedAt: new Date(),
          clientFeedback: dto.reason,
        },
        include: { milestone: true },
      });

      await this.timelineEventsService.createEvent(
        {
          actorId: portalToken.id,
          actorRole: TimelineActorRole.CLIENT,
          agreementId: delivery.agreementId,
          milestoneId: delivery.milestoneId,
          type: TimelineEventType.DELIVERY_CHANGES_REQUESTED,
          title: 'Delivery Changes Requested',
          description: `Changes requested for milestone "${result.milestone?.title ?? ''}"`,
          metadata: {
            deliveryId: delivery.id,
            reason: dto.reason,
            ...(dto.requestedCriteria?.length && {
              requestedCriteria: dto.requestedCriteria,
            }),
          },
        },
        tx,
      );

      // No direct payment status change per constitution
      // Optional hold path remains a future delegated PaymentsService concern

      try {
        await this.emailNotificationsService.enqueueDeliveryChangesRequestedForFreelancer(
          {
            agreementId: delivery.agreementId,
            deliveryId: delivery.id,
            milestoneId: delivery.milestoneId,
            milestoneTitle: result.milestone?.title ?? '',
            reason: dto.reason,
          },
        );
      } catch {
        // non-blocking per spec FR-015
      }

      return result;
    });

    return this.toDeliveryResponse(updated, updated.milestone || undefined);
  }

  // ──────────────────────────────────────────────────────────
  //  UI 3 — Read
  // ──────────────────────────────────────────────────────────

  async getDeliveryById(id: string): Promise<DeliveryResponseDto> {
    const userId = this.clsService.get('userId');
    if (!userId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: { milestone: true },
    });
    if (!delivery) {
      throw new AppException({ code: ErrorCode.DELIVERY_NOT_FOUND });
    }

    const agreement = await this.prisma.agreement.findUnique({
      where: { id: delivery.agreementId },
    });
    if (!agreement || agreement.freelancerId !== userId) {
      throw new AppException({ code: ErrorCode.DELIVERY_NOT_FOUND });
    }

    return this.toDeliveryResponse(delivery, delivery.milestone || undefined);
  }

  async listDeliveries(
    query: DeliveryQueryDto,
  ): Promise<DeliveryListResponseDto> {
    const userId = this.clsService.get('userId');
    if (!userId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      agreement: {
        freelancerId: userId,
      },
    };

    if (query.agreementId) {
      (where as any).agreementId = query.agreementId;
    }
    if (query.milestoneId) {
      (where as any).milestoneId = query.milestoneId;
    }
    if (query.status) {
      (where as any).status = query.status;
    }

    const [deliveries, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where: where as any,
        include: { milestone: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.delivery.count({ where: where as any }),
    ]);

    return {
      deliveries: deliveries.map((d) =>
        this.toDeliveryResponse(d, d.milestone || undefined),
      ),
      page,
      limit,
      total,
    };
  }

  // ──────────────────────────────────────────────────────────
  //  Private Helpers
  // ──────────────────────────────────────────────────────────

  private async ensureOwnedMilestone(milestoneId: string, userId: string) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { agreement: true },
    });
    if (!milestone) {
      throw new AppException({ code: ErrorCode.MILESTONE_NOT_FOUND });
    }
    if (!milestone.agreement || milestone.agreement.freelancerId !== userId) {
      throw new AppException({ code: ErrorCode.FORBIDDEN });
    }
    if (milestone.agreement.status === 'CANCELLED') {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_ACTIVE });
    }
    return milestone;
  }

  private async ensureOwnedDelivery(deliveryId: string, userId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { agreement: true, milestone: true },
    });
    if (!delivery) {
      throw new AppException({ code: ErrorCode.DELIVERY_NOT_FOUND });
    }
    if (!delivery.agreement || delivery.agreement.freelancerId !== userId) {
      throw new AppException({ code: ErrorCode.DELIVERY_NOT_FOUND });
    }
    return delivery;
  }

  private isEditable(status: string): boolean {
    return EDITABLE_DELIVERY_STATUSES.includes(status as PrismaDeliveryStatus);
  }

  private isReviewable(status: string): boolean {
    return REVIEWABLE_DELIVERY_STATUSES.includes(
      status as PrismaDeliveryStatus,
    );
  }

  private async resolvePortalToken(token: string, deliveryId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: { agreementId: true },
    });
    if (!delivery) {
      throw new AppException({ code: ErrorCode.DELIVERY_NOT_FOUND });
    }

    const portalToken = await this.prisma.portalToken.findUnique({
      where: { tokenHash: createHash('sha256').update(token).digest('hex') },
    });
    if (!portalToken) {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    }
    if (portalToken.revokedAt) {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    }
    if (portalToken.expiresAt && portalToken.expiresAt < new Date()) {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    }
    if (portalToken.type !== PortalTokenType.DELIVERY_REVIEW) {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    }
    if (portalToken.agreementId !== delivery.agreementId) {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    }

    return portalToken;
  }

  private toDeliveryResponse(
    delivery: any,
    milestone?: any,
  ): DeliveryResponseDto {
    return {
      id: delivery.id,
      agreementId: delivery.agreementId,
      milestoneId: delivery.milestoneId,
      submittedById: delivery.submittedById,
      deliveryUrl: delivery.deliveryUrl ?? null,
      fileUrl: delivery.fileUrl ?? null,
      fileName: delivery.fileName ?? null,
      fileType: delivery.fileType ?? null,
      summary: delivery.summary,
      notes: delivery.notes ?? null,
      status: delivery.status,
      submittedAt: delivery.submittedAt?.toISOString() ?? null,
      acceptedAt: delivery.acceptedAt?.toISOString() ?? null,
      changesRequestedAt: delivery.changesRequestedAt?.toISOString() ?? null,
      clientFeedback: delivery.clientFeedback ?? null,
      milestone: milestone
        ? {
            id: milestone.id,
            title: milestone.title,
            status: milestone.status,
            paymentStatus: milestone.paymentStatus,
            deliveryStatus: milestone.deliveryStatus,
            revisionLimit: milestone.revisionLimit,
          }
        : ({} as any),
      payment: null,
      timeline: {
        agreementId: delivery.agreementId,
        milestoneId: delivery.milestoneId ?? null,
      },
      createdAt: delivery.createdAt?.toISOString() ?? '',
      updatedAt: delivery.updatedAt?.toISOString() ?? '',
    };
  }
}
