import { Injectable } from '@nestjs/common';
import {
  ChangeRequestActionDto,
  CreateChangeRequestDto,
} from './dto/change-requests.dto';

/**
 * Module responsibility:
 * - Manage scope changes, approval flow, and related payment follow-up.
 * Main entities touched:
 * - ChangeRequest, Payment, TimelineEvent.
 * Expected endpoints:
 * - GET /change-requests
 * - POST /change-requests
 * - GET /change-requests/:id
 * - POST /change-requests/:id/approve
 * - POST /change-requests/:id/decline
 * - POST /change-requests/:id/pay
 * Business rules:
 * - Distinguish approved, declined, and paid transitions.
 * - Preserve scope and acceptance criteria snapshots.
 * Implementation phases:
 * - Phase 5.
 * Error cases to document:
 * - CHANGE_REQUEST_NOT_FOUND, CHANGE_REQUEST_ALREADY_APPROVED, CHANGE_REQUEST_INVALID_SCOPE.
 * Testing cases to cover:
 * - create, fetch, approve, decline, pay.
 */
@Injectable()
export class ChangeRequestsService {
  list() {
    return this.placeholder('list');
  }

  create(dto: CreateChangeRequestDto) {
    return this.placeholder('create', { dto });
  }

  getById(id: string) {
    return this.placeholder('getById', { id });
  }

  approve(id: string, dto: ChangeRequestActionDto) {
    return this.placeholder('approve', { id, dto });
  }

  decline(id: string, dto: ChangeRequestActionDto) {
    return this.placeholder('decline', { id, dto });
  }

  pay(id: string, dto: ChangeRequestActionDto) {
    return this.placeholder('pay', { id, dto });
  }

  private placeholder(action: string, details?: Record<string, unknown>) {
    return {
      module: 'change-requests',
      action,
      phase: 0,
      status: 'not-implemented',
      ...details,
    };
  }
}
