import {
  ChangeRequestStatus,
  PaymentOperationType,
  PaymentStatus,
  Prisma,
  TimelineActorRole,
  TimelineEventType,
  AIRecommendation,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Injectable } from '@nestjs/common';
import { ClsService } from '../../common/cls/cls.service';
import { AppException } from '../../common/errors/app-exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { TimelineEventsService } from '../timeline-events/timeline-events.service';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import { CreateChangeRequestDto } from './dto/create-change-request.dto';
import { UpdateChangeRequestDto } from './dto/update-change-request.dto';
import { ChangeRequestQueryDto } from './dto/change-request-query.dto';
import { PortalDeclineChangeRequestDto } from './dto/portal-decline-change-request.dto';
import { PortalFundPaymentDto } from '../payments/dto/payments.dto';
import {
  ChangeRequestResponseDto,
  ChangeRequestListItemDto,
  PaymentSummaryDto,
} from './dto/change-request-response.dto';

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class ChangeRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly timelineEventsService: TimelineEventsService,
    private readonly emailService: EmailNotificationsService,
    private readonly clsService: ClsService,
  ) {}

  // ============================================================
  // US1: Freelancer list, create, getById
  // ============================================================

  async list(
    agreementId: string,
    query: ChangeRequestQueryDto,
    userId?: string,
  ): Promise<{ data: ChangeRequestListItemDto[]; total: number }> {
    const resolvedUserId = userId ?? this.clsService.get('userId');
    if (!resolvedUserId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    await this.requireAgreementOwnership(agreementId, resolvedUserId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ChangeRequestWhereInput = {
      agreementId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.milestoneId ? { milestoneId: query.milestoneId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.changeRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          agreementId: true,
          milestoneId: true,
          title: true,
          amount: true,
          currency: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.changeRequest.count({ where }),
    ]);

    return {
      data: items.map((cr) => ({
        id: cr.id,
        agreementId: cr.agreementId,
        milestoneId: cr.milestoneId ?? null,
        title: cr.title,
        amount: String(cr.amount),
        currency: cr.currency,
        status: cr.status,
        paymentStatus: cr.paymentStatus,
        createdAt: cr.createdAt.toISOString(),
        updatedAt: cr.updatedAt.toISOString(),
      })),
      total,
    };
  }

  async create(
    agreementId: string,
    dto: CreateChangeRequestDto,
    userId?: string,
  ): Promise<ChangeRequestResponseDto> {
    const resolvedUserId = userId ?? this.clsService.get('userId');
    if (!resolvedUserId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    await this.requireAgreementOwnership(agreementId, resolvedUserId);

    const amount = new Decimal(dto.amount);
    if (amount.lessThanOrEqualTo(0)) {
      throw new AppException({
        code: ErrorCode.CHANGE_REQUEST_AMOUNT_INVALID,
      });
    }

    if (dto.aiReviewId) {
      const aiReview = await this.prisma.aIReview.findUnique({
        where: { id: dto.aiReviewId },
        select: { agreementId: true },
      });

      if (!aiReview) {
        throw new AppException({ code: ErrorCode.AI_REVIEW_NOT_FOUND });
      }

      if (aiReview.agreementId !== agreementId) {
        throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
      }
    }

    const changeRequest = await this.prisma.$transaction(async (tx) => {
      const cr = await tx.changeRequest.create({
        data: {
          agreementId,
          milestoneId: dto.milestoneId ?? null,
          aiReviewId: dto.aiReviewId ?? null,
          requestedByRole: TimelineActorRole.FREELANCER,
          title: dto.title,
          description: dto.description,
          amount,
          currency: dto.currency,
          additionalTimelineText: dto.additionalTimelineText ?? null,
          timelineDays: dto.timelineDays ?? null,
          acceptanceCriteria: dto.acceptanceCriteria,
          status: ChangeRequestStatus.DRAFT,
          paymentStatus: PaymentStatus.WAITING,
        },
        include: {
          payments: {
            select: {
              id: true,
              status: true,
              amount: true,
              currency: true,
              operationType: true,
            },
          },
        },
      });

      await this.timelineEventsService.createEvent(
        {
          actorRole: TimelineActorRole.FREELANCER,
          agreementId,
          type: TimelineEventType.CHANGE_REQUEST_CREATED,
          title: 'Change request created',
          description: `Change request "${dto.title}" for ${dto.currency} ${dto.amount} was created.`,
          metadata: { changeRequestId: cr.id, aiReviewId: dto.aiReviewId },
        },
        tx,
      );

      return cr;
    });

    return this.toResponseDto(changeRequest);
  }

  async getById(
    id: string,
    userId?: string,
  ): Promise<ChangeRequestResponseDto> {
    const resolvedUserId = userId ?? this.clsService.get('userId');
    if (!resolvedUserId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    const changeRequest = await this.prisma.changeRequest.findUnique({
      where: { id },
      include: {
        agreement: { select: { freelancerId: true } },
        payments: {
          select: {
            id: true,
            status: true,
            amount: true,
            currency: true,
            operationType: true,
          },
        },
      },
    });

    if (
      !changeRequest ||
      changeRequest.agreement.freelancerId !== resolvedUserId
    ) {
      throw new AppException({ code: ErrorCode.CHANGE_REQUEST_NOT_FOUND });
    }

    return this.toResponseDto(changeRequest);
  }

  // ============================================================
  // US2: Freelancer update and send
  // ============================================================

  async update(
    id: string,
    dto: UpdateChangeRequestDto,
    userId?: string,
  ): Promise<ChangeRequestResponseDto> {
    const resolvedUserId = userId ?? this.clsService.get('userId');
    if (!resolvedUserId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    const changeRequest = await this.prisma.changeRequest.findUnique({
      where: { id },
      include: {
        agreement: { select: { freelancerId: true } },
        payments: {
          select: {
            id: true,
            status: true,
            amount: true,
            currency: true,
            operationType: true,
          },
        },
      },
    });

    if (
      !changeRequest ||
      changeRequest.agreement.freelancerId !== resolvedUserId
    ) {
      throw new AppException({ code: ErrorCode.CHANGE_REQUEST_NOT_FOUND });
    }

    if (changeRequest.status !== ChangeRequestStatus.DRAFT) {
      throw new AppException({ code: ErrorCode.CHANGE_REQUEST_NOT_EDITABLE });
    }

    const updateData: Prisma.ChangeRequestUpdateInput = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.amount !== undefined) updateData.amount = new Decimal(dto.amount);
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.timelineDays !== undefined)
      updateData.timelineDays = dto.timelineDays;
    if (dto.additionalTimelineText !== undefined)
      updateData.additionalTimelineText = dto.additionalTimelineText;
    if (dto.acceptanceCriteria !== undefined)
      updateData.acceptanceCriteria = dto.acceptanceCriteria;

    const updated = await this.prisma.changeRequest.update({
      where: { id },
      data: updateData,
      include: {
        payments: {
          select: {
            id: true,
            status: true,
            amount: true,
            currency: true,
            operationType: true,
          },
        },
      },
    });

    return this.toResponseDto(updated);
  }

  async send(id: string, userId?: string): Promise<ChangeRequestResponseDto> {
    const resolvedUserId = userId ?? this.clsService.get('userId');
    if (!resolvedUserId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    const changeRequest = await this.prisma.changeRequest.findUnique({
      where: { id },
      include: {
        agreement: { select: { freelancerId: true } },
        payments: {
          select: {
            id: true,
            status: true,
            amount: true,
            currency: true,
            operationType: true,
          },
        },
      },
    });

    if (
      !changeRequest ||
      changeRequest.agreement.freelancerId !== resolvedUserId
    ) {
      throw new AppException({ code: ErrorCode.CHANGE_REQUEST_NOT_FOUND });
    }

    if (changeRequest.status !== ChangeRequestStatus.DRAFT) {
      throw new AppException({ code: ErrorCode.CHANGE_REQUEST_NOT_SENDABLE });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.changeRequest.update({
        where: { id },
        data: { status: ChangeRequestStatus.SENT },
        include: {
          payments: {
            select: {
              id: true,
              status: true,
              amount: true,
              currency: true,
              operationType: true,
            },
          },
        },
      });

      return result;
    });

    try {
      await this.emailService.enqueueChangeRequestSentForClient({
        agreementId: changeRequest.agreementId,
        changeRequestId: id,
        title: changeRequest.title,
      });
    } catch {
      /* non-blocking — log if needed */
    }

    return this.toResponseDto(updated);
  }

  // ============================================================
  // US3: Client portal approve
  // ============================================================

  async approveFromPortal(
    changeRequestId: string,
  ): Promise<ChangeRequestResponseDto> {
    const ctx = this.clsService.getContext();
    const portalAgreementId = ctx?.agreementId;

    if (!portalAgreementId) {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    }

    const changeRequest = await this.prisma.changeRequest.findUnique({
      where: { id: changeRequestId },
      include: { payments: true },
    });

    if (!changeRequest || changeRequest.agreementId !== portalAgreementId) {
      throw new AppException({ code: ErrorCode.CHANGE_REQUEST_NOT_FOUND });
    }

    if (changeRequest.status !== ChangeRequestStatus.SENT) {
      throw new AppException({ code: ErrorCode.CHANGE_REQUEST_NOT_APPROVABLE });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.changeRequest.update({
        where: { id: changeRequestId },
        data: {
          status: ChangeRequestStatus.APPROVED,
          approvedAt: new Date(),
          paymentStatus: PaymentStatus.WAITING,
        },
        include: {
          payments: true,
        },
      });

      await this.paymentsService.createPaymentForChangeRequest(tx, {
        agreementId: changeRequest.agreementId,
        amount: changeRequest.amount,
        currency: changeRequest.currency,
        changeRequestId,
      });

      await this.timelineEventsService.createEvent(
        {
          actorRole: TimelineActorRole.CLIENT,
          agreementId: changeRequest.agreementId,
          type: TimelineEventType.CHANGE_REQUEST_APPROVED,
          title: 'Change request approved',
          description: `Change request "${changeRequest.title}" was approved by the client.`,
          metadata: { changeRequestId, approvedAt: new Date().toISOString() },
        },
        tx,
      );

      return result;
    });

    try {
      await this.emailService.enqueueChangeRequestApprovedForFreelancer({
        agreementId: changeRequest.agreementId,
        changeRequestId,
        title: changeRequest.title,
      });
    } catch {
      /* non-blocking */
    }

    return this.toResponseDto(updated);
  }

  // ============================================================
  // US4: Client portal decline
  // ============================================================

  async declineFromPortal(
    changeRequestId: string,
    dto: PortalDeclineChangeRequestDto,
  ): Promise<ChangeRequestResponseDto> {
    const ctx = this.clsService.getContext();
    const portalAgreementId = ctx?.agreementId;

    if (!portalAgreementId) {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    }

    const changeRequest = await this.prisma.changeRequest.findUnique({
      where: { id: changeRequestId },
      include: { payments: true },
    });

    if (!changeRequest || changeRequest.agreementId !== portalAgreementId) {
      throw new AppException({ code: ErrorCode.CHANGE_REQUEST_NOT_FOUND });
    }

    if (changeRequest.status !== ChangeRequestStatus.SENT) {
      throw new AppException({
        code: ErrorCode.CHANGE_REQUEST_NOT_DECLINABLE,
      });
    }

    const existingMetadata =
      (changeRequest.metadata as Record<string, unknown>) ?? {};
    const mergedMetadata = {
      ...existingMetadata,
      declineReason: dto.reason,
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.changeRequest.update({
        where: { id: changeRequestId },
        data: {
          status: ChangeRequestStatus.DECLINED,
          declinedAt: new Date(),
          metadata: mergedMetadata,
        },
        include: {
          payments: true,
        },
      });

      await this.timelineEventsService.createEvent(
        {
          actorRole: TimelineActorRole.CLIENT,
          agreementId: changeRequest.agreementId,
          type: TimelineEventType.CHANGE_REQUEST_DECLINED,
          title: 'Change request declined',
          description: `Change request "${changeRequest.title}" was declined. Reason: ${dto.reason}`,
          metadata: {
            changeRequestId,
            declinedAt: new Date().toISOString(),
            declineReason: dto.reason,
          },
        },
        tx,
      );

      return result;
    });

    try {
      await this.emailService.enqueueChangeRequestDeclinedForFreelancer({
        agreementId: changeRequest.agreementId,
        changeRequestId,
        title: changeRequest.title,
      });
    } catch {
      /* non-blocking */
    }

    return this.toResponseDto(updated);
  }

  // ============================================================
  // US5: Client portal fund
  // ============================================================

  async fundFromPortal(
    changeRequestId: string,
    dto: PortalFundPaymentDto,
  ): Promise<ChangeRequestResponseDto> {
    const ctx = this.clsService.getContext();
    const portalAgreementId = ctx?.agreementId;

    if (!portalAgreementId) {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    }

    const changeRequest = await this.prisma.changeRequest.findUnique({
      where: { id: changeRequestId },
      include: { payments: true },
    });

    if (!changeRequest || changeRequest.agreementId !== portalAgreementId) {
      throw new AppException({ code: ErrorCode.CHANGE_REQUEST_NOT_FOUND });
    }

    if (changeRequest.status !== ChangeRequestStatus.APPROVED) {
      throw new AppException({ code: ErrorCode.CHANGE_REQUEST_NOT_APPROVED });
    }

    const waitingPayment = changeRequest.payments.find(
      (p) =>
        p.status === PaymentStatus.WAITING &&
        p.operationType === PaymentOperationType.CHANGE_REQUEST_PAYMENT,
    );

    if (!waitingPayment) {
      throw new AppException({ code: ErrorCode.PAYMENT_NOT_FUNDABLE });
    }

    this.paymentsService.validateTransition(
      PaymentStatus.WAITING,
      PaymentStatus.RESERVED,
    );

    const requestAmount = new Decimal(dto.amount);
    if (!requestAmount.equals(waitingPayment.amount)) {
      throw new AppException({ code: ErrorCode.PAYMENT_INVALID_AMOUNT });
    }

    const receiptNumber = this.generateReceiptNumber();
    const transactionReference = this.generateTransactionReference();
    const paymentMethodLabel = dto.paymentMethodLabel ?? 'Demo Bank Transfer';
    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: waitingPayment.id },
        data: {
          status: PaymentStatus.RESERVED,
          receiptNumber,
          transactionReference,
          paymentMethodLabel,
          reservedAt: now,
        },
      });

      const result = await tx.changeRequest.update({
        where: { id: changeRequestId },
        data: {
          status: ChangeRequestStatus.FUNDED,
          fundedAt: now,
          paymentStatus: PaymentStatus.RESERVED,
        },
        include: {
          payments: true,
        },
      });

      await this.timelineEventsService.createEvent(
        {
          actorRole: TimelineActorRole.CLIENT,
          agreementId: changeRequest.agreementId,
          type: TimelineEventType.CHANGE_REQUEST_FUNDED,
          title: 'Change request funded',
          description: `Change request "${changeRequest.title}" was funded with ${changeRequest.currency} ${changeRequest.amount.toString()}.`,
          metadata: {
            changeRequestId,
            fundedAt: now.toISOString(),
            receiptNumber,
            transactionReference,
          },
        },
        tx,
      );

      await this.timelineEventsService.createEvent(
        {
          actorRole: TimelineActorRole.CLIENT,
          agreementId: changeRequest.agreementId,
          type: TimelineEventType.PAYMENT_RESERVED,
          title: 'Payment reserved',
          description: `Payment of ${changeRequest.currency} ${changeRequest.amount.toString()} has been reserved. Receipt: ${receiptNumber}`,
          metadata: {
            paymentId: waitingPayment.id,
            previousStatus: PaymentStatus.WAITING,
            newStatus: PaymentStatus.RESERVED,
            receiptNumber,
            transactionReference,
          },
        },
        tx,
      );

      return result;
    });

    return this.toResponseDto(updated);
  }

  // ============================================================
  // US6: AI review conversion
  // ============================================================

  async createFromAiReview(
    aiReviewId: string,
    options: {
      title: string;
      description: string;
      amount: Decimal | string;
      currency: string;
      acceptanceCriteria: string[];
      timelineDays?: number;
      additionalTimelineText?: string;
    },
  ): Promise<ChangeRequestResponseDto> {
    const aiReview = await this.prisma.aIReview.findUnique({
      where: { id: aiReviewId },
      select: {
        id: true,
        agreementId: true,
        recommendation: true,
      },
    });

    if (!aiReview) {
      throw new AppException({ code: ErrorCode.AI_REVIEW_NOT_FOUND });
    }

    if (
      aiReview.recommendation !== AIRecommendation.PARTIAL &&
      aiReview.recommendation !== AIRecommendation.NEEDS_HUMAN_REVIEW
    ) {
      throw new AppException({
        code: ErrorCode.AI_REVIEW_NOT_ELIGIBLE_FOR_CHANGE_REQUEST,
      });
    }

    const amount =
      typeof options.amount === 'string'
        ? new Decimal(options.amount)
        : options.amount;

    if (amount.lessThanOrEqualTo(0)) {
      throw new AppException({
        code: ErrorCode.CHANGE_REQUEST_AMOUNT_INVALID,
      });
    }

    const changeRequest = await this.prisma.$transaction(async (tx) => {
      const cr = await tx.changeRequest.create({
        data: {
          agreementId: aiReview.agreementId,
          aiReviewId,
          requestedByRole: TimelineActorRole.AI,
          title: options.title,
          description: options.description,
          amount,
          currency: options.currency,
          timelineDays: options.timelineDays ?? null,
          additionalTimelineText: options.additionalTimelineText ?? null,
          acceptanceCriteria: options.acceptanceCriteria,
          status: ChangeRequestStatus.DRAFT,
          paymentStatus: PaymentStatus.WAITING,
        },
        include: {
          payments: {
            select: {
              id: true,
              status: true,
              amount: true,
              currency: true,
              operationType: true,
            },
          },
        },
      });

      await this.timelineEventsService.createEvent(
        {
          actorRole: TimelineActorRole.AI,
          agreementId: aiReview.agreementId,
          type: TimelineEventType.CHANGE_REQUEST_CREATED,
          title: 'Change request created from AI review',
          description: `Change request "${options.title}" was created from AI review recommendation.`,
          metadata: {
            changeRequestId: cr.id,
            aiReviewId,
            recommendation: aiReview.recommendation,
          },
        },
        tx,
      );

      return cr;
    });

    return this.toResponseDto(changeRequest);
  }

  // ============================================================
  // Helpers
  // ============================================================

  private async requireAgreementOwnership(
    agreementId: string,
    userId: string,
  ): Promise<void> {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      select: { freelancerId: true },
    });

    if (!agreement || agreement.freelancerId !== userId) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }
  }

  private toResponseDto(changeRequest: {
    id: string;
    agreementId: string;
    milestoneId: string | null;
    aiReviewId: string | null;
    requestedByRole: TimelineActorRole;
    title: string;
    description: string;
    amount: Decimal | string;
    currency: string;
    additionalTimelineText: string | null;
    timelineDays: number | null;
    acceptanceCriteria: Prisma.JsonValue;
    status: ChangeRequestStatus;
    paymentStatus: PaymentStatus;
    approvedAt: Date | null;
    declinedAt: Date | null;
    fundedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    payments: {
      id: string;
      status: PaymentStatus;
      amount: Decimal | string;
      currency: string;
      operationType: PaymentOperationType;
    }[];
  }): ChangeRequestResponseDto {
    return {
      id: changeRequest.id,
      agreementId: changeRequest.agreementId,
      milestoneId: changeRequest.milestoneId ?? null,
      aiReviewId: changeRequest.aiReviewId ?? null,
      requestedByRole: changeRequest.requestedByRole,
      title: changeRequest.title,
      description: changeRequest.description,
      amount: String(changeRequest.amount),
      currency: changeRequest.currency,
      additionalTimelineText: changeRequest.additionalTimelineText ?? null,
      timelineDays: changeRequest.timelineDays ?? null,
      acceptanceCriteria: Array.isArray(changeRequest.acceptanceCriteria)
        ? (changeRequest.acceptanceCriteria as string[])
        : [],
      status: changeRequest.status,
      paymentStatus: changeRequest.paymentStatus,
      approvedAt: changeRequest.approvedAt?.toISOString() ?? null,
      declinedAt: changeRequest.declinedAt?.toISOString() ?? null,
      fundedAt: changeRequest.fundedAt?.toISOString() ?? null,
      createdAt: changeRequest.createdAt.toISOString(),
      updatedAt: changeRequest.updatedAt.toISOString(),
      payments: (changeRequest.payments ?? []).map((p) => ({
        id: p.id,
        status: p.status,
        amount: String(p.amount),
        currency: p.currency,
        operationType: p.operationType,
      })),
    };
  }

  private generateReceiptNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    const randomPart = this.generateRandomAlphanumeric(6);
    return `DHM-${dateStr}-${randomPart}`;
  }

  private generateTransactionReference(): string {
    return `TXN-${this.generateCuid()}`;
  }

  private generateRandomAlphanumeric(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateCuid(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
