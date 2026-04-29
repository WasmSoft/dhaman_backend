import { Injectable } from '@nestjs/common';
import {
  PaymentOperationType as PrismaPaymentOperationType,
  PaymentStatus as PrismaPaymentStatus,
  Prisma,
} from '@prisma/client';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { FundMilestonePaymentDto, ReleasePaymentDto } from './dto/payments.dto';

type TransactionClient = Prisma.TransactionClient;

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
  constructor(private readonly prisma: PrismaService) {}

  listByAgreementId(agreementId: string) {
    return this.placeholder('listByAgreementId', { agreementId });
  }

  fundMilestone(dto: FundMilestonePaymentDto) {
    return this.placeholder('fundMilestone', { dto });
  }

  release(dto: ReleasePaymentDto) {
    return this.placeholder('release', { dto });
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
        operationType: PrismaPaymentOperationType.FUND_MILESTONE,
        status: PrismaPaymentStatus.WAITING,
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
        operationType: PrismaPaymentOperationType.FUND_MILESTONE,
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
        operationType: PrismaPaymentOperationType.FUND_MILESTONE,
      },
    });

    if (!payment) {
      throw new AppException({ code: ErrorCode.PAYMENT_NOT_FOUND });
    }

    if (payment.status !== PrismaPaymentStatus.WAITING) {
      throw new AppException({ code: ErrorCode.MILESTONE_PAYMENT_NOT_WAITING });
    }

    return tx.payment.delete({ where: { id: payment.id } });
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
