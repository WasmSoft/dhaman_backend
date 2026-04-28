import { Injectable } from '@nestjs/common';
import {
  CreateDeliveryDto,
  DeliveryActionDto,
  DeliveryLookupDto,
} from './dto/deliveries.dto';

/**
 * Module responsibility:
 * - Receive milestone deliveries and manage acceptance/change-request actions.
 * Main entities touched:
 * - Delivery, Milestone, Agreement, TimelineEvent.
 * Expected endpoints:
 * - POST /milestones/:milestoneId/deliveries
 * - GET /deliveries
 * - GET /deliveries/:id
 * - POST /deliveries/:id/request-change
 * - POST /deliveries/:id/accept
 * Business rules:
 * - Require URL or file input.
 * - Ensure milestone review-state transitions remain consistent.
 * Implementation phases:
 * - Phase 3.
 * Error cases to document:
 * - DELIVERY_NOT_FOUND, DELIVERY_ALREADY_SUBMITTED, DELIVERY_NOT_IN_REVIEW.
 * Testing cases to cover:
 * - submit, fetch, request change, accept, invalid transitions.
 */
@Injectable()
export class DeliveriesService {
  create(milestoneId: string, dto: CreateDeliveryDto) {
    return this.placeholder('create', { milestoneId, dto });
  }

  list(query: DeliveryLookupDto) {
    return this.placeholder('list', { query });
  }

  getById(id: string) {
    return this.placeholder('getById', { id });
  }

  requestChange(id: string, dto: DeliveryActionDto) {
    return this.placeholder('requestChange', { id, dto });
  }

  accept(id: string, dto: DeliveryActionDto) {
    return this.placeholder('accept', { id, dto });
  }

  private placeholder(action: string, details?: Record<string, unknown>) {
    return {
      module: 'deliveries',
      action,
      phase: 0,
      status: 'not-implemented',
      ...details,
    };
  }
}
