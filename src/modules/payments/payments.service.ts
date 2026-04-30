import {
  AIRecommendation,
  TimelineActorRole,
  MilestoneStatus,
  PaymentOperationType,
  PaymentStatus,
  TimelineEventType,
  Prisma,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AgreementsService } from '../agreements/agreements.service';
import { FundMilestonePaymentDto, ReleasePaymentDto } from './dto/payments.dto';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly agreementsService?: AgreementsService,
    private readonly timelineEventsService?: TimelineEventsService,
  ) {}

  listByAgreementId(agreementId: string) {
    return this.placeholder('listByAgreementId', { agreementId });
  }

  fundMilestone(dto: FundMilestonePaymentDto) {
    return this.placeholder('fundMilestone', { dto });
  }

  release(dto: ReleasePaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id: dto.paymentId },
      });

      if (!payment) {
        throw new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND });
      }

      if (payment.status === PaymentStatus.RELEASED) {
        throw new AppException({ code: ErrorCode.PAYMENT_ALREADY_RELEASED });
      }

      if (payment.status !== PaymentStatus.READY_TO_RELEASE) {
        throw new AppException({
          code: ErrorCode.PAYMENT_NOT_READY_TO_RELEASE,
        });
      }

      if (!payment.milestoneId) {
        throw new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND });
      }

      const releasedAt = new Date();

      const releasedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.RELEASED,
          releasedAt,
        },
      });

      await tx.milestone.update({
        where: { id: payment.milestoneId },
        data: {
          paymentStatus: PaymentStatus.RELEASED,
          status: MilestoneStatus.ACCEPTED,
        },
      });

      await this.timelineEventsService?.createEvent(
        {
          agreementId: payment.agreementId,
          milestoneId: payment.milestoneId ?? undefined,
          actorRole: TimelineActorRole.FREELANCER,
          type: TimelineEventType.PAYMENT_RELEASED,
          title: 'Payment released',
          description: 'Milestone payment was released.',
          metadata: {
            titleEn: 'Payment released',
            titleAr: 'تم تحرير الدفعة',
            descriptionEn: 'Milestone payment was released.',
            descriptionAr: 'تم تحرير دفعة المرحلة.',
          },
        },
        tx,
      );

      const completion = await this.agreementsService?.checkCompletionStatus(
        tx,
        payment.agreementId,
      );

      return {
        paymentId: releasedPayment.id,
        status: releasedPayment.status,
        completed: completion?.completed ?? false,
        agreementStatus: completion?.status ?? null,
        timelineEventCreated: completion?.timelineEventCreated ?? false,
      };
    });
  }

  getById(id: string) {
    return this.placeholder('getById', { id });
  }

  getReceipt(id: string) {
    return this.placeholder('getReceipt', { id });
  }

  // AR: ينشئ دفعة تجريبية مرتبطة بالمرحلة داخل نفس المعاملة لضمان الاتساق.
  // EN: Creates the demo milestone payment inside the same transaction for consistency.
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

  // AR: يزامن مبلغ دفعة المرحلة داخل نفس المعاملة دون تغيير حالة الدفعة.
  // EN: Syncs the milestone payment amount inside the same transaction without changing payment state.
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

  // AR: يحذف دفعة المرحلة فقط إذا كانت ما زالت في حالة انتظار وداخل نفس المعاملة.
  // EN: Deletes the milestone payment only if it is still waiting and within the same transaction.
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
