import { Injectable } from '@nestjs/common';
import { GenerateAiPlanDto } from './dto/ai-plan.dto';

/**
 * Module responsibility:
 * - Generate milestone/payment plan drafts using AI assistance.
 * Main entities touched:
 * - Agreement, Milestone.
 * Expected endpoints:
 * - POST /ai-plan/generate
 * Business rules:
 * - Keep generated outputs scoped to agreement/payment planning.
 * - Validate AI responses before persistence.
 * Implementation phases:
 * - Phase 5.
 * Error cases to document:
 * - AI_PLAN_GENERATION_FAILED, AI_INVALID_RESPONSE.
 * Testing cases to cover:
 * - generation success, malformed AI output, provider failure.
 */
@Injectable()
export class AiPlanService {
  generate(dto: GenerateAiPlanDto) {
    return {
      module: 'ai-plan',
      action: 'generate',
      phase: 0,
      status: 'not-implemented',
      dto,
    };
  }
}
