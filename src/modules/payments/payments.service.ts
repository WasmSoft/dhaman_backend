import {
  PaymentOperationType as PrismaPaymentOperationType,
  PaymentStatus as PrismaPaymentStatus,
  MilestoneStatus as PrismaMilestoneStatus,
  AIRecommendation,
  TimelineActorRole,
  MilestoneStatus,
  PaymentOperationType,
  PaymentStatus,
  TimelineEventType,
  Prisma,
  TimelineEventType as PrismaTimelineEventType,
  TimelineActorRole as PrismaTimelineActorRole,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/errors/app-exception';
import { ClsService } from '../../common/cls/cls.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AgreementsService } from '../agreements/agreements.service';
import {
  FundMilestoneDto,
  PortalFundPaymentDto,
  PortalReleaseConfirmationDto,
  ReleasePaymentDto,
  PaymentResponseDto,
  PaymentReceiptResponseDto,
  PaymentListResponseDto,
} from './dto/payments.dto';
import { TimelineEventsService } from '../timeline-events/timeline-events.service';

const AI_REVIEW_ALLOWED_PAYMENT_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.RESERVED,
  PaymentStatus.CLIENT_REVIEW,
  PaymentStatus.READY_TO_RELEASE,
  PaymentStatus.ON_HOLD,
]);

type TransactionClient = Prisma.TransactionClient;

type PaymentWriteClient = Pick<
  PrismaService | Prisma.TransactionClient,
  'payment' | 'milestone'
>;

/**
 * Module responsibility:
 * - Handle demo payment reservation, release, and receipt retrieval.
 * Main entities touched:
 * - Payment, Agreement, Milestone, ChangeRequest, TimelineEvent.
 * Expected endpoints:
 * - GET /agreements/:agreementId/payments
 * - POST /payments/fund-milestone
 * - POST /payments/release
 * - GET /payments/:id
 * - GET /payments/:id/receipt
 * Business rules:
 * - Demo mode only in MVP.
 * - Track reserve and release timestamps consistently.
 * Implementation phases:
 * - Phase 3.
 * Error cases to document:
 * - PAYMENT_NOT_FOUND, PAYMENT_ALREADY_RESERVED, PAYMENT_ALREADY_RELEASED.
 * Testing cases to cover:
 * - fund, release, invalid state transitions, receipt fetch.
 */
@Injectable()
export class PaymentsService {
  private readonly validTransitions: Record<
    PrismaPaymentStatus,
    PrismaPaymentStatus[]
  > = {
    [PrismaPaymentStatus.WAITING]: [PrismaPaymentStatus.RESERVED],
    [PrismaPaymentStatus.RESERVED]: [PrismaPaymentStatus.CLIENT_REVIEW],
    [PrismaPaymentStatus.CLIENT_REVIEW]: [
      PrismaPaymentStatus.READY_TO_RELEASE,
      PrismaPaymentStatus.AI_REVIEW,
      PrismaPaymentStatus.ON_HOLD,
    ],
    [PrismaPaymentStatus.AI_REVIEW]: [
      PrismaPaymentStatus.READY_TO_RELEASE,
      PrismaPaymentStatus.ON_HOLD,
    ],
    [PrismaPaymentStatus.READY_TO_RELEASE]: [PrismaPaymentStatus.RELEASED],
    [PrismaPaymentStatus.RELEASED]: [],
    [PrismaPaymentStatus.ON_HOLD]: [PrismaPaymentStatus.CLIENT_REVIEW],
    [PrismaPaymentStatus.FAILED]: [],
    [PrismaPaymentStatus.REFUNDED]: [],
    [PrismaPaymentStatus.NOT_REQUIRED]: [],
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly timelineEventsService: TimelineEventsService,
    private readonly clsService: ClsService,
    private readonly agreementsService?: AgreementsService,
  ) {}

  validateTransition(
    currentStatus: PrismaPaymentStatus,
    targetStatus: PrismaPaymentStatus,
  ): boolean {
    if (currentStatus === targetStatus) {
      throw new AppException({
        code: ErrorCode.PAYMENT_INVALID_TRANSITION,
      });
    }

    const allowedTargets = this.validTransitions[currentStatus];
    if (!allowedTargets || !allowedTargets.includes(targetStatus)) {
      throw new AppException({
        code: ErrorCode.PAYMENT_INVALID_TRANSITION,
      });
    }

    return true;
  }

  // ============================================================
  // Receipt / Reference Generators
  // ============================================================

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

  // ============================================================
  // DTO Mappers
  // ============================================================

  private toPaymentResponseDto(payment: {
    id: string;
    agreementId: string;
    milestoneId: string | null;
    changeRequestId: string | null;
    amount: Decimal | string;
    currency: string;
    status: PrismaPaymentStatus;
    operationType: PrismaPaymentOperationType;
    paymentMethodLabel: string | null;
    receiptNumber: string | null;
    transactionReference: string | null;
    demoMode: boolean;
    reservedAt: Date | null;
    releasedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): PaymentResponseDto {
    return {
      id: payment.id,
      agreementId: payment.agreementId,
      milestoneId: payment.milestoneId ?? undefined,
      changeRequestId: payment.changeRequestId ?? undefined,
      amount: String(payment.amount),
      currency: payment.currency,
      status: payment.status,
      operationType: payment.operationType,
      paymentMethodLabel: payment.paymentMethodLabel ?? undefined,
      receiptNumber: payment.receiptNumber ?? undefined,
      transactionReference: payment.transactionReference ?? undefined,
      demoMode: payment.demoMode,
      reservedAt: payment.reservedAt?.toISOString() ?? undefined,
      releasedAt: payment.releasedAt?.toISOString() ?? undefined,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }

  private toPaymentReceiptResponseDto(payment: {
    id: string;
    agreementId: string;
    milestoneId: string | null;
    amount: Decimal | string;
    currency: string;
    status: PrismaPaymentStatus;
    operationType: PrismaPaymentOperationType;
    paymentMethodLabel: string | null;
    receiptNumber: string | null;
    transactionReference: string | null;
    demoMode: boolean;
    reservedAt: Date | null;
    releasedAt: Date | null;
    milestone?: { title: string } | null;
  }): PaymentReceiptResponseDto {
    return {
      id: payment.receiptNumber ?? payment.id,
      paymentId: payment.id,
      receiptNumber: payment.receiptNumber ?? '',
      transactionReference: payment.transactionReference ?? '',
      amount: String(payment.amount),
      currency: payment.currency,
      status: payment.status,
      operationType: payment.operationType,
      paymentMethodLabel: payment.paymentMethodLabel ?? undefined,
      agreementId: payment.agreementId,
      milestoneTitle: payment.milestone?.title ?? undefined,
      demoMode: payment.demoMode,
      reservedAt: payment.reservedAt?.toISOString() ?? undefined,
      createdAt: new Date().toISOString(),
      issuedAt: payment.reservedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  // ============================================================
  // Timeline Metadata Builder
  // ============================================================

  private buildPaymentTimelineMetadata(params: {
    paymentId: string;
    previousStatus: PrismaPaymentStatus;
    newStatus: PrismaPaymentStatus;
    receiptNumber?: string;
    transactionReference?: string;
    releasedAt?: string;
    notes?: string;
    reason?: string;
  }): Record<string, unknown> {
    return this.withoutUndefined({
      paymentId: params.paymentId,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      receiptNumber: params.receiptNumber,
      transactionReference: params.transactionReference,
      releasedAt: params.releasedAt,
      notes: params.notes,
      reason: params.reason,
    });
  }

  private withoutUndefined(
    record: Record<string, unknown>,
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(record).filter(([, value]) => value !== undefined),
    );
  }

  // ============================================================
  // Ownership Guard
  // ============================================================

  private async requireAgreementOwnership(agreementId: string, userId: string) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      select: { freelancerId: true, currency: true },
    });

    if (!agreement || agreement.freelancerId !== userId) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }

    return agreement;
  }

  private async requirePaymentOwnership(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        agreement: { select: { freelancerId: true } },
        milestone: { select: { title: true } },
      },
    });

    if (!payment || payment.agreement.freelancerId !== userId) {
      throw new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND });
    }

    return payment;
  }

  // ============================================================
  // Phase 2: Core Payment Operations
  // ============================================================

  async fundMilestone(
    dto: FundMilestoneDto,
    actorId?: string,
    actorRole: PrismaTimelineActorRole = PrismaTimelineActorRole.FREELANCER,
  ): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findFirst({
      where: {
        milestoneId: dto.milestoneId,
        operationType: PrismaPaymentOperationType.FUND_MILESTONE,
      },
      include: {
        agreement: true,
        milestone: true,
      },
    });

    if (!payment) {
      throw new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND });
    }

    if (payment.status !== PrismaPaymentStatus.WAITING) {
      throw new AppException({ code: ErrorCode.PAYMENT_ALREADY_RESERVED });
    }

    const requestAmount = new Decimal(dto.amount);
    if (!requestAmount.equals(payment.amount)) {
      throw new AppException({ code: ErrorCode.PAYMENT_INVALID_AMOUNT });
    }

    this.validateTransition(payment.status, PrismaPaymentStatus.RESERVED);

    const receiptNumber = this.generateReceiptNumber();
    const transactionReference = this.generateTransactionReference();
    const paymentMethodLabel = dto.paymentMethodLabel ?? 'Demo Bank Transfer';
    const now = new Date();

    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      const result = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PrismaPaymentStatus.RESERVED,
          receiptNumber,
          transactionReference,
          paymentMethodLabel,
          reservedAt: now,
        },
      });

      if (payment.milestoneId) {
        await tx.milestone.update({
          where: { id: payment.milestoneId },
          data: { paymentStatus: PrismaPaymentStatus.RESERVED },
        });
      }

      await this.timelineEventsService.createEvent(
        {
          actorId: actorId ?? 'system',
          actorRole,
          agreementId: payment.agreementId,
          milestoneId: payment.milestoneId ?? undefined,
          type: PrismaTimelineEventType.PAYMENT_RESERVED,
          title: 'Payment Reserved',
          description: `Payment of ${payment.currency} ${payment.amount.toString()} has been reserved. Receipt: ${receiptNumber}`,
          metadata: this.buildPaymentTimelineMetadata({
            paymentId: payment.id,
            previousStatus: PrismaPaymentStatus.WAITING,
            newStatus: PrismaPaymentStatus.RESERVED,
            receiptNumber,
            transactionReference,
          }),
        },
        tx,
      );

      return result;
    });

    return this.toPaymentResponseDto(updatedPayment);
  }

  async releasePayment(
    dto: ReleasePaymentDto,
    actorId?: string,
    actorRole: PrismaTimelineActorRole = PrismaTimelineActorRole.FREELANCER,
  ): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
      include: {
        milestone: true,
      },
    });

    if (!payment) {
      throw new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND });
    }

    if (payment.status === PrismaPaymentStatus.RELEASED) {
      throw new AppException({ code: ErrorCode.PAYMENT_ALREADY_RELEASED });
    }

    if (payment.status !== PrismaPaymentStatus.READY_TO_RELEASE) {
      throw new AppException({ code: ErrorCode.PAYMENT_NOT_READY_TO_RELEASE });
    }

    this.validateTransition(payment.status, PrismaPaymentStatus.RELEASED);

    const now = new Date();

    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      const result = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PrismaPaymentStatus.RELEASED,
          releasedAt: now,
        },
      });

      if (payment.milestoneId && payment.milestone) {
        await tx.milestone.update({
          where: { id: payment.milestoneId },
          data: {
            paymentStatus: PrismaPaymentStatus.RELEASED,
            ...(payment.milestone.status !== PrismaMilestoneStatus.ACCEPTED
              ? { status: PrismaMilestoneStatus.ACCEPTED }
              : {}),
          },
        });
      }

      await this.timelineEventsService.createEvent(
        {
          actorId: actorId ?? 'system',
          actorRole,
          agreementId: payment.agreementId,
          milestoneId: payment.milestoneId ?? undefined,
          type: PrismaTimelineEventType.PAYMENT_RELEASED,
          title: 'Payment Released',
          description: `Payment of ${payment.currency} ${payment.amount.toString()} has been released.${dto.notes ? ` Notes: ${dto.notes}` : ''}`,
          metadata: this.buildPaymentTimelineMetadata({
            paymentId: payment.id,
            previousStatus: PrismaPaymentStatus.READY_TO_RELEASE,
            newStatus: PrismaPaymentStatus.RELEASED,
            releasedAt: now.toISOString(),
            notes: dto.notes,
          }),
        },
        tx,
      );

      return result;
    });

    return this.toPaymentResponseDto(updatedPayment);
  }

  async getPayment(
    paymentId: string,
    userId: string,
  ): Promise<PaymentResponseDto> {
    const payment = await this.requirePaymentOwnership(paymentId, userId);
    return this.toPaymentResponseDto(payment);
  }

  async getPaymentReceipt(
    paymentId: string,
    userId: string,
  ): Promise<PaymentReceiptResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        agreement: { select: { freelancerId: true } },
        milestone: { select: { title: true } },
      },
    });

    if (!payment || payment.agreement.freelancerId !== userId) {
      throw new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND });
    }

    if (!payment.receiptNumber) {
      throw new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND });
    }

    return this.toPaymentReceiptResponseDto(payment);
  }

  async getAgreementPayments(
    agreementId: string,
    userId: string,
  ): Promise<PaymentListResponseDto> {
    await this.requireAgreementOwnership(agreementId, userId);

    const payments = await this.prisma.payment.findMany({
      where: { agreementId },
      orderBy: { createdAt: 'asc' },
    });

    const currency = payments.length > 0 ? payments[0].currency : 'SAR';

    let totalFunded = new Decimal(0);
    let totalReleased = new Decimal(0);
    let totalPending = new Decimal(0);

    for (const p of payments) {
      const amount =
        p.amount instanceof Decimal ? p.amount : new Decimal(String(p.amount));

      if (p.status === PrismaPaymentStatus.RELEASED) {
        totalReleased = totalReleased.plus(amount);
      } else if (p.status === PrismaPaymentStatus.WAITING) {
        totalPending = totalPending.plus(amount);
      }

      if (
        p.status === PrismaPaymentStatus.RESERVED ||
        p.status === PrismaPaymentStatus.CLIENT_REVIEW ||
        p.status === PrismaPaymentStatus.AI_REVIEW ||
        p.status === PrismaPaymentStatus.READY_TO_RELEASE ||
        p.status === PrismaPaymentStatus.RELEASED
      ) {
        totalFunded = totalFunded.plus(amount);
      }
    }

    return {
      payments: payments.map((p) => this.toPaymentResponseDto(p)),
      totalFunded: totalFunded.toFixed(2),
      totalReleased: totalReleased.toFixed(2),
      totalPending: totalPending.toFixed(2),
      currency,
    };
  }

  // ============================================================
  // Phase 3: Status Transition Methods
  // ============================================================

  async transitionToClientReview(
    paymentId: string,
    actorId: string,
    actorRole: PrismaTimelineActorRole = PrismaTimelineActorRole.FREELANCER,
  ): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { milestone: true },
    });

    if (!payment) {
      throw new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND });
    }

    this.validateTransition(payment.status, PrismaPaymentStatus.CLIENT_REVIEW);

    const previousStatus = payment.status;

    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      const result = await tx.payment.update({
        where: { id: payment.id },
        data: { status: PrismaPaymentStatus.CLIENT_REVIEW },
      });

      if (payment.milestoneId) {
        await tx.milestone.update({
          where: { id: payment.milestoneId },
          data: { paymentStatus: PrismaPaymentStatus.CLIENT_REVIEW },
        });
      }

      await this.timelineEventsService.createEvent(
        {
          actorId,
          actorRole,
          agreementId: payment.agreementId,
          milestoneId: payment.milestoneId ?? undefined,
          type: PrismaTimelineEventType.PAYMENT_STATUS_CHANGED,
          title: 'Payment Moved to Client Review',
          description: `Payment status changed from ${previousStatus} to ${PrismaPaymentStatus.CLIENT_REVIEW}`,
          metadata: this.buildPaymentTimelineMetadata({
            paymentId: payment.id,
            previousStatus,
            newStatus: PrismaPaymentStatus.CLIENT_REVIEW,
          }),
        },
        tx,
      );

      return result;
    });

    return this.toPaymentResponseDto(updatedPayment);
  }

  async transitionToAiReview(
    paymentId: string,
    actorId: string,
    actorRole: PrismaTimelineActorRole = PrismaTimelineActorRole.FREELANCER,
  ): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { milestone: true },
    });

    if (!payment) {
      throw new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND });
    }

    this.validateTransition(payment.status, PrismaPaymentStatus.AI_REVIEW);

    const previousStatus = payment.status;

    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      const result = await tx.payment.update({
        where: { id: payment.id },
        data: { status: PrismaPaymentStatus.AI_REVIEW },
      });

      if (payment.milestoneId) {
        await tx.milestone.update({
          where: { id: payment.milestoneId },
          data: { paymentStatus: PrismaPaymentStatus.AI_REVIEW },
        });
      }

      await this.timelineEventsService.createEvent(
        {
          actorId,
          actorRole,
          agreementId: payment.agreementId,
          milestoneId: payment.milestoneId ?? undefined,
          type: PrismaTimelineEventType.PAYMENT_ESCALATED_TO_AI,
          title: 'Payment Escalated to AI Review',
          description: `Payment escalated from ${previousStatus} to ${PrismaPaymentStatus.AI_REVIEW} for AI arbitration`,
          metadata: this.buildPaymentTimelineMetadata({
            paymentId: payment.id,
            previousStatus,
            newStatus: PrismaPaymentStatus.AI_REVIEW,
          }),
        },
        tx,
      );

      return result;
    });

    return this.toPaymentResponseDto(updatedPayment);
  }

  async transitionToReadyToRelease(
    paymentId: string,
    actorId: string,
    actorRole: PrismaTimelineActorRole = PrismaTimelineActorRole.FREELANCER,
  ): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { milestone: true },
    });

    if (!payment) {
      throw new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND });
    }

    this.validateTransition(
      payment.status,
      PrismaPaymentStatus.READY_TO_RELEASE,
    );

    const previousStatus = payment.status;

    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      const result = await tx.payment.update({
        where: { id: payment.id },
        data: { status: PrismaPaymentStatus.READY_TO_RELEASE },
      });

      if (payment.milestoneId) {
        await tx.milestone.update({
          where: { id: payment.milestoneId },
          data: { paymentStatus: PrismaPaymentStatus.READY_TO_RELEASE },
        });
      }

      await this.timelineEventsService.createEvent(
        {
          actorId,
          actorRole,
          agreementId: payment.agreementId,
          milestoneId: payment.milestoneId ?? undefined,
          type: PrismaTimelineEventType.PAYMENT_READY_TO_RELEASE,
          title: 'Payment Ready to Release',
          description: `Payment approved for release from ${previousStatus}`,
          metadata: this.buildPaymentTimelineMetadata({
            paymentId: payment.id,
            previousStatus,
            newStatus: PrismaPaymentStatus.READY_TO_RELEASE,
          }),
        },
        tx,
      );

      return result;
    });

    return this.toPaymentResponseDto(updatedPayment);
  }

  async transitionToOnHold(
    paymentId: string,
    reason: string,
    actorId: string,
    actorRole: PrismaTimelineActorRole = PrismaTimelineActorRole.FREELANCER,
  ): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { milestone: true },
    });

    if (!payment) {
      throw new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND });
    }

    this.validateTransition(payment.status, PrismaPaymentStatus.ON_HOLD);

    const previousStatus = payment.status;

    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      const result = await tx.payment.update({
        where: { id: payment.id },
        data: { status: PrismaPaymentStatus.ON_HOLD },
      });

      if (payment.milestoneId) {
        await tx.milestone.update({
          where: { id: payment.milestoneId },
          data: { paymentStatus: PrismaPaymentStatus.ON_HOLD },
        });
      }

      await this.timelineEventsService.createEvent(
        {
          actorId,
          actorRole,
          agreementId: payment.agreementId,
          milestoneId: payment.milestoneId ?? undefined,
          type: PrismaTimelineEventType.PAYMENT_ON_HOLD,
          title: 'Payment On Hold',
          description: `Payment placed on hold from ${previousStatus}. Reason: ${reason}`,
          metadata: this.buildPaymentTimelineMetadata({
            paymentId: payment.id,
            previousStatus,
            newStatus: PrismaPaymentStatus.ON_HOLD,
            reason,
          }),
        },
        tx,
      );

      return result;
    });

    return this.toPaymentResponseDto(updatedPayment);
  }

  async transitionFromOnHold(
    paymentId: string,
    actorId: string,
    actorRole: PrismaTimelineActorRole = PrismaTimelineActorRole.FREELANCER,
  ): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { milestone: true },
    });

    if (!payment) {
      throw new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND });
    }

    this.validateTransition(payment.status, PrismaPaymentStatus.CLIENT_REVIEW);

    const previousStatus = payment.status;

    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      const result = await tx.payment.update({
        where: { id: payment.id },
        data: { status: PrismaPaymentStatus.CLIENT_REVIEW },
      });

      if (payment.milestoneId) {
        await tx.milestone.update({
          where: { id: payment.milestoneId },
          data: { paymentStatus: PrismaPaymentStatus.CLIENT_REVIEW },
        });
      }

      await this.timelineEventsService.createEvent(
        {
          actorId,
          actorRole,
          agreementId: payment.agreementId,
          milestoneId: payment.milestoneId ?? undefined,
          type: PrismaTimelineEventType.PAYMENT_STATUS_CHANGED,
          title: 'Payment Returned from Hold',
          description: `Payment moved from ${previousStatus} to ${PrismaPaymentStatus.CLIENT_REVIEW} after resubmission`,
          metadata: this.buildPaymentTimelineMetadata({
            paymentId: payment.id,
            previousStatus,
            newStatus: PrismaPaymentStatus.CLIENT_REVIEW,
          }),
        },
        tx,
      );

      return result;
    });

    return this.toPaymentResponseDto(updatedPayment);
  }

  // listByAgreementId(agreementId: string) {
  //   return this.placeholder('listByAgreementId', { agreementId });
  // }

  // fundMilestone(dto: FundMilestonePaymentDto) {
  //   return this.placeholder('fundMilestone', { dto });
  // }

  // getById(id: string) {
  //   return this.placeholder('getById', { id });
  // }

  // getReceipt(id: string) {
  //   return this.placeholder('getReceipt', { id });
  // }

  // ============================================================
  // Controller Compatibility Aliases
  // ============================================================

  async release(
    dto: ReleasePaymentDto,
    actorId?: string,
    actorRole: PrismaTimelineActorRole = PrismaTimelineActorRole.FREELANCER,
  ): Promise<PaymentResponseDto> {
    return this.releasePayment(dto, actorId, actorRole);
  }

  async getById(id: string, userId?: string): Promise<PaymentResponseDto> {
    if (!userId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }
    return this.getPayment(id, userId);
  }

  async getReceipt(
    id: string,
    userId?: string,
  ): Promise<PaymentReceiptResponseDto> {
    if (!userId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }
    return this.getPaymentReceipt(id, userId);
  }

  async listByAgreementId(
    agreementId: string,
    userId?: string,
  ): Promise<PaymentListResponseDto> {
    if (!userId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }
    return this.getAgreementPayments(agreementId, userId);
  }

  // ============================================================
  // Phase 4: Portal Endpoints (CLIENT-facing)
  // ============================================================

  async portalFund(
    _token: string,
    paymentId: string,
    dto: PortalFundPaymentDto,
  ): Promise<PaymentResponseDto> {
    const ctx = this.clsService.getContext();
    if (!ctx?.agreementId || !ctx?.portalTokenId) {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    }

    const portalTokenType = ctx.portalTokenType;
    if (
      portalTokenType !== 'PAYMENT_VIEW' &&
      portalTokenType !== 'AGREEMENT_APPROVAL'
    ) {
      throw new AppException({ code: ErrorCode.PORTAL_ACTION_NOT_ALLOWED });
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { agreement: true, milestone: true },
    });

    if (!payment || payment.agreementId !== ctx.agreementId) {
      throw new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND });
    }

    if (payment.status !== PrismaPaymentStatus.WAITING) {
      throw new AppException({ code: ErrorCode.PAYMENT_ALREADY_RESERVED });
    }

    const requestAmount = new Decimal(dto.amount);
    if (!requestAmount.equals(payment.amount)) {
      throw new AppException({ code: ErrorCode.PAYMENT_INVALID_AMOUNT });
    }

    this.validateTransition(payment.status, PrismaPaymentStatus.RESERVED);

    const receiptNumber = this.generateReceiptNumber();
    const transactionReference = this.generateTransactionReference();
    const paymentMethodLabel = dto.paymentMethodLabel ?? 'Demo Bank Transfer';
    const now = new Date();

    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      const result = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PrismaPaymentStatus.RESERVED,
          receiptNumber,
          transactionReference,
          paymentMethodLabel,
          reservedAt: now,
        },
      });

      if (payment.milestoneId) {
        await tx.milestone.update({
          where: { id: payment.milestoneId },
          data: { paymentStatus: PrismaPaymentStatus.RESERVED },
        });
      }

      await this.timelineEventsService.createEvent(
        {
          actorId: ctx.portalTokenId,
          actorRole: PrismaTimelineActorRole.CLIENT,
          agreementId: payment.agreementId,
          milestoneId: payment.milestoneId ?? undefined,
          type: PrismaTimelineEventType.PAYMENT_RESERVED,
          title: 'Payment Funded via Client Portal',
          description: `Payment of ${payment.currency} ${payment.amount.toString()} has been funded via portal. Receipt: ${receiptNumber}`,
          metadata: this.buildPaymentTimelineMetadata({
            paymentId: payment.id,
            previousStatus: PrismaPaymentStatus.WAITING,
            newStatus: PrismaPaymentStatus.RESERVED,
            receiptNumber,
            transactionReference,
          }),
        },
        tx,
      );

      return result;
    });

    return this.toPaymentResponseDto(updatedPayment);
  }

  async portalReleaseConfirmation(
    _token: string,
    paymentId: string,
    dto: PortalReleaseConfirmationDto,
  ): Promise<PaymentResponseDto> {
    const ctx = this.clsService.getContext();
    if (!ctx?.agreementId || !ctx?.portalTokenId) {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    }

    const portalTokenType = ctx.portalTokenType;
    if (
      portalTokenType !== 'DELIVERY_REVIEW' &&
      portalTokenType !== 'AGREEMENT_APPROVAL'
    ) {
      throw new AppException({ code: ErrorCode.PORTAL_ACTION_NOT_ALLOWED });
    }

    if (!dto.confirmed) {
      throw new AppException({ code: ErrorCode.PORTAL_ACTION_NOT_ALLOWED });
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { milestone: true },
    });

    if (!payment || payment.agreementId !== ctx.agreementId) {
      throw new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND });
    }

    if (payment.status === PrismaPaymentStatus.RELEASED) {
      throw new AppException({ code: ErrorCode.PAYMENT_ALREADY_RELEASED });
    }

    if (payment.status !== PrismaPaymentStatus.READY_TO_RELEASE) {
      throw new AppException({ code: ErrorCode.PAYMENT_NOT_READY_TO_RELEASE });
    }

    this.validateTransition(payment.status, PrismaPaymentStatus.RELEASED);

    const now = new Date();

    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      const result = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PrismaPaymentStatus.RELEASED,
          releasedAt: now,
        },
      });

      if (payment.milestoneId && payment.milestone) {
        await tx.milestone.update({
          where: { id: payment.milestoneId },
          data: {
            paymentStatus: PrismaPaymentStatus.RELEASED,
            ...(payment.milestone.status !== PrismaMilestoneStatus.ACCEPTED
              ? { status: PrismaMilestoneStatus.ACCEPTED }
              : {}),
          },
        });
      }

      await this.timelineEventsService.createEvent(
        {
          actorId: ctx.portalTokenId,
          actorRole: PrismaTimelineActorRole.CLIENT,
          agreementId: payment.agreementId,
          milestoneId: payment.milestoneId ?? undefined,
          type: PrismaTimelineEventType.PAYMENT_RELEASED,
          title: 'Payment Released via Client Portal',
          description: `Payment of ${payment.currency} ${payment.amount.toString()} has been released via portal.${dto.notes ? ` Notes: ${dto.notes}` : ''}`,
          metadata: this.buildPaymentTimelineMetadata({
            paymentId: payment.id,
            previousStatus: PrismaPaymentStatus.READY_TO_RELEASE,
            newStatus: PrismaPaymentStatus.RELEASED,
            releasedAt: now.toISOString(),
            notes: dto.notes,
          }),
        },
        tx,
      );

      return result;
    });

    return this.toPaymentResponseDto(updatedPayment);
  }

  // ============================================================
  // MilestonesService Integration
  // ============================================================

  async createPaymentForMilestone(
    tx: TransactionClient,
    input: {
      agreementId: string;
      amount: Prisma.Decimal | string;
      currency: string;
      milestoneId: string;
    },
  ) {
    return tx.payment.create({
      data: {
        agreementId: input.agreementId,
        amount: input.amount,
        currency: input.currency,
        demoMode: true,
        milestoneId: input.milestoneId,
        operationType: PaymentOperationType.FUND_MILESTONE,
        status: PaymentStatus.WAITING,
      },
    });
  }

  async createPaymentForChangeRequest(
    tx: TransactionClient,
    input: {
      agreementId: string;
      amount: Prisma.Decimal | string;
      currency: string;
      changeRequestId: string;
    },
  ) {
    return tx.payment.create({
      data: {
        agreementId: input.agreementId,
        amount: input.amount,
        currency: input.currency,
        demoMode: true,
        changeRequestId: input.changeRequestId,
        operationType: PaymentOperationType.CHANGE_REQUEST_PAYMENT,
        status: PaymentStatus.WAITING,
      },
    });
  }

  async syncMilestonePaymentAmount(
    tx: TransactionClient,
    input: {
      amount: Prisma.Decimal | string;
      milestoneId: string;
    },
  ) {
    const payment = await tx.payment.findFirst({
      where: {
        milestoneId: input.milestoneId,
        operationType: PaymentOperationType.FUND_MILESTONE,
      },
    });

    if (!payment) {
      throw new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND });
    }

    return tx.payment.update({
      where: { id: payment.id },
      data: { amount: input.amount },
    });
  }

  async deleteWaitingPaymentForMilestone(
    tx: TransactionClient,
    input: { milestoneId: string },
  ) {
    const payment = await tx.payment.findFirst({
      where: {
        milestoneId: input.milestoneId,
        operationType: PaymentOperationType.FUND_MILESTONE,
      },
    });

    if (!payment) {
      throw new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND });
    }

    if (payment.status !== PaymentStatus.WAITING) {
      throw new AppException({ code: ErrorCode.MILESTONE_PAYMENT_NOT_WAITING });
    }

    return tx.payment.delete({ where: { id: payment.id } });
  }

  // AR: ينقل دفعة المرحلة إلى حالة مراجعة الذكاء الاصطناعي ويحافظ على اتساق حالة المرحلة.
  // EN: Moves the milestone payment into AI review and keeps milestone payment status aligned.
  async transitionMilestonePaymentToAiReview(
    input: {
      agreementId: string;
      milestoneId: string;
      deliveryId: string;
    },
    tx?: PaymentWriteClient,
  ): Promise<{
    paymentId: string;
    previousStatus: PaymentStatus;
    newStatus: PaymentStatus;
  }> {
    const client = tx ?? this.prisma;

    const payment = await client.payment.findFirst({
      where: {
        agreementId: input.agreementId,
        milestoneId: input.milestoneId,
        operationType: PaymentOperationType.FUND_MILESTONE,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true },
    });

    if (!payment) {
      throw new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND });
    }

    if (!AI_REVIEW_ALLOWED_PAYMENT_STATUSES.has(payment.status)) {
      throw new AppException({
        code: ErrorCode.PAYMENT_NOT_READY_TO_RELEASE,
        details: {
          currentStatus: payment.status,
          expectedStatus: 'reviewable',
          deliveryId: input.deliveryId,
        },
      });
    }

    await client.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.AI_REVIEW },
    });

    await client.milestone.update({
      where: { id: input.milestoneId },
      data: { paymentStatus: PaymentStatus.AI_REVIEW },
    });

    return {
      paymentId: payment.id,
      previousStatus: payment.status,
      newStatus: PaymentStatus.AI_REVIEW,
    };
  }

  // AR: ينقل دفعة المرحلة من حالة مراجعة الذكاء الاصطناعي إلى الحالة النهائية بناءً على التوصية.
  // EN: Moves the milestone payment from AI review to the final status based on the recommendation.
  async transitionPaymentFromAiReviewToOutcome(
    input: {
      agreementId: string;
      milestoneId: string;
    },
    recommendation: AIRecommendation,
    tx?: PaymentWriteClient,
  ): Promise<{
    paymentId: string;
    newStatus: PaymentStatus;
  }> {
    const client = tx ?? this.prisma;

    const payment = await client.payment.findFirst({
      where: {
        agreementId: input.agreementId,
        milestoneId: input.milestoneId,
        operationType: PaymentOperationType.FUND_MILESTONE,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true },
    });

    if (!payment) {
      throw new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND });
    }

    if (payment.status !== PaymentStatus.AI_REVIEW) {
      throw new AppException({
        code: ErrorCode.PAYMENT_NOT_READY_TO_RELEASE,
        details: {
          currentStatus: payment.status,
          expectedStatus: PaymentStatus.AI_REVIEW,
        },
      });
    }

    let targetStatus: PaymentStatus | null = null;

    switch (recommendation) {
      case AIRecommendation.ACCEPT:
        targetStatus = PaymentStatus.READY_TO_RELEASE;
        break;
      case AIRecommendation.REJECT:
      case AIRecommendation.PARTIAL:
        targetStatus = PaymentStatus.ON_HOLD;
        break;
      case AIRecommendation.NEEDS_HUMAN_REVIEW:
        targetStatus = null;
        break;
    }

    if (targetStatus) {
      await client.payment.update({
        where: { id: payment.id },
        data: { status: targetStatus },
      });

      await client.milestone.update({
        where: { id: input.milestoneId },
        data: { paymentStatus: targetStatus },
      });
    }

    return {
      paymentId: payment.id,
      newStatus: targetStatus ?? PaymentStatus.AI_REVIEW,
    };
  }

  private placeholder(action: string, details?: Record<string, unknown>) {
    return {
      module: 'payments',
      action,
      phase: 0,
      status: 'not-implemented',
      ...details,
    };
  }
}
