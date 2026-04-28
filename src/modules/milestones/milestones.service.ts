import { Injectable } from '@nestjs/common';
import {
  CreateMilestoneDto,
  UpdateMilestoneDto,
  UpdateMilestoneStatusDto,
} from './dto/milestones.dto';

/**
 * Module responsibility:
 * - Manage agreement milestones, ordering, and review states.
 * Main entities touched:
 * - Milestone, Agreement, TimelineEvent.
 * Expected endpoints:
 * - GET /agreements/:agreementId/milestones
 * - POST /agreements/:agreementId/milestones
 * - PATCH /milestones/:id
 * - PATCH /milestones/:id/status
 * Business rules:
 * - Validate amount and ordering.
 * - Drive payment and delivery readiness states.
 * Implementation phases:
 * - Phase 2.
 * Error cases to document:
 * - MILESTONE_NOT_FOUND, MILESTONE_INVALID_AMOUNT, MILESTONE_INVALID_ORDER.
 * Testing cases to cover:
 * - ordered creation, invalid totals, status transitions.
 */
@Injectable()
export class MilestonesService {
  listByAgreementId(agreementId: string) {
    return this.placeholder('listByAgreementId', { agreementId });
  }

  create(agreementId: string, dto: CreateMilestoneDto) {
    return this.placeholder('create', { agreementId, dto });
  }

  update(id: string, dto: UpdateMilestoneDto) {
    return this.placeholder('update', { id, dto });
  }

  updateStatus(id: string, dto: UpdateMilestoneStatusDto) {
    return this.placeholder('updateStatus', { id, dto });
  }

  private placeholder(action: string, details?: Record<string, unknown>) {
    return {
      module: 'milestones',
      action,
      phase: 0,
      status: 'not-implemented',
      ...details,
    };
  }
}
