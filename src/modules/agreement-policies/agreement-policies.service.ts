import { Injectable } from '@nestjs/common';
import { UpdateAgreementPoliciesDto } from './dto/agreement-policies.dto';

/**
 * Module responsibility:
 * - Store and validate agreement-level policy text and review windows.
 * Main entities touched:
 * - AgreementPolicy, Agreement.
 * Expected endpoints:
 * - GET /agreements/:agreementId/policies
 * - PATCH /agreements/:agreementId/policies
 * Business rules:
 * - Ensure one policy record per agreement.
 * - Validate grace and review period boundaries.
 * Implementation phases:
 * - Phase 2.
 * Error cases to document:
 * - POLICY_NOT_FOUND, POLICY_INVALID_REVIEW_PERIOD, POLICY_INVALID_CONTENT.
 * Testing cases to cover:
 * - fetch, update, invalid review period, agreement ownership.
 */
@Injectable()
export class AgreementPoliciesService {
  getByAgreementId(agreementId: string) {
    return this.placeholder('getByAgreementId', { agreementId });
  }

  updateByAgreementId(agreementId: string, dto: UpdateAgreementPoliciesDto) {
    return this.placeholder('updateByAgreementId', { agreementId, dto });
  }

  private placeholder(action: string, details?: Record<string, unknown>) {
    return {
      module: 'agreement-policies',
      action,
      phase: 0,
      status: 'not-implemented',
      ...details,
    };
  }
}
