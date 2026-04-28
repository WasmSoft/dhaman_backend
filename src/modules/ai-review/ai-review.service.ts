import { Injectable } from '@nestjs/common';
import { CreateAiReviewDto } from './dto/ai-review.dto';

/**
 * Module responsibility:
 * - Orchestrate AI review requests and recommendation acceptance flow.
 * Main entities touched:
 * - AIReview, Agreement, Milestone, Delivery, TimelineEvent.
 * Expected endpoints:
 * - POST /ai-review
 * - GET /ai-review
 * - GET /ai-review/:id
 * - POST /ai-review/:id/accept-recommendation
 * Business rules:
 * - Prevent duplicate completion.
 * - Preserve raw AI response for auditability.
 * Implementation phases:
 * - Phase 5.
 * Error cases to document:
 * - AI_REVIEW_FAILED, AI_REVIEW_NOT_FOUND, AI_REVIEW_ALREADY_COMPLETED.
 * Testing cases to cover:
 * - create, list, retrieve, accept recommendation once.
 */
@Injectable()
export class AiReviewService {
  create(dto: CreateAiReviewDto) {
    return this.placeholder('create', { dto });
  }

  list() {
    return this.placeholder('list');
  }

  getById(id: string) {
    return this.placeholder('getById', { id });
  }

  acceptRecommendation(id: string) {
    return this.placeholder('acceptRecommendation', { id });
  }

  private placeholder(action: string, details?: Record<string, unknown>) {
    return {
      module: 'ai-review',
      action,
      phase: 0,
      status: 'not-implemented',
      ...details,
    };
  }
}
