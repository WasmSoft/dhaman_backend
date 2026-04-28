import { Injectable } from '@nestjs/common';
import { TimelineQueryDto } from './dto/timeline-events.dto';

/**
 * Module responsibility:
 * - Provide ordered timeline views for agreement activity.
 * Main entities touched:
 * - TimelineEvent, Agreement, Milestone.
 * Expected endpoints:
 * - GET /agreements/:agreementId/timeline
 * Business rules:
 * - Maintain chronological integrity and actor attribution.
 * - Support agreement-level filtering with optional milestone context.
 * Implementation phases:
 * - Phase 3.
 * Error cases to document:
 * - AGREEMENT_NOT_FOUND.
 * Testing cases to cover:
 * - agreement timeline fetch, milestone filtering, ordering.
 */
@Injectable()
export class TimelineEventsService {
  listByAgreementId(agreementId: string, query: TimelineQueryDto) {
    return {
      module: 'timeline-events',
      action: 'listByAgreementId',
      phase: 0,
      status: 'not-implemented',
      agreementId,
      query,
    };
  }
}
