import { Injectable } from '@nestjs/common';

/**
 * Phase 1 scope: scaffold and DTO contracts only.
 * No lifecycle transitions, invitations, activation, archival, persistence,
 * emails, or payments are implemented in this phase.
 *
 * All methods return placeholder responses indicating "not-implemented" status.
 */
@Injectable()
export class AgreementsService {
  list() {
    return this.placeholder('list');
  }

  create(dto: unknown) {
    return this.placeholder('create', { dto });
  }

  getById(id: string) {
    return this.placeholder('getById', { id });
  }

  update(id: string, dto: unknown) {
    return this.placeholder('update', { id, dto });
  }

  sendInvite(id: string) {
    return this.placeholder('sendInvite', { id });
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
