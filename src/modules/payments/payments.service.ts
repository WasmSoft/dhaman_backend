import { Injectable } from '@nestjs/common';
import { FundMilestonePaymentDto, ReleasePaymentDto } from './dto/payments.dto';

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
