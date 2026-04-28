import { Injectable } from '@nestjs/common';
import {
  AgreementActionDto,
  CreateAgreementDto,
  UpdateAgreementDto,
} from './dto/agreements.dto';

/**
 * Module responsibility:
 * - Manage agreement lifecycle from draft to approval/change workflow.
 * Main entities touched:
 * - Agreement, AgreementPolicy, TimelineEvent, EmailNotification.
 * Expected endpoints:
 * - GET /agreements
 * - POST /agreements
 * - GET /agreements/:id
 * - PATCH /agreements/:id
 * - POST /agreements/:id/send-invite
 * - POST /agreements/:id/approve
 * - POST /agreements/:id/request-change
 * Business rules:
 * - Require client ownership and valid totals.
 * - Lock edits after specific lifecycle transitions.
 * - Emit timeline and notification side effects.
 * Implementation phases:
 * - Phase 2.
 * Error cases to document:
 * - AGREEMENT_NOT_FOUND, AGREEMENT_ALREADY_SENT, AGREEMENT_ALREADY_APPROVED.
 * Testing cases to cover:
 * - draft creation, update restrictions, invite sending, approval transitions.
 */
@Injectable()
export class AgreementsService {
  list() {
    return this.placeholder('list');
  }

  create(dto: CreateAgreementDto) {
    return this.placeholder('create', { dto });
  }

  getById(id: string) {
    return this.placeholder('getById', { id });
  }

  update(id: string, dto: UpdateAgreementDto) {
    return this.placeholder('update', { id, dto });
  }

  sendInvite(id: string) {
    return this.placeholder('sendInvite', { id });
  }

  approve(id: string) {
    return this.placeholder('approve', { id });
  }

  requestChange(id: string, dto: AgreementActionDto) {
    return this.placeholder('requestChange', { id, dto });
  }

  private placeholder(action: string, details?: Record<string, unknown>) {
    return {
      module: 'agreements',
      action,
      phase: 0,
      status: 'not-implemented',
      ...details,
    };
  }
}
