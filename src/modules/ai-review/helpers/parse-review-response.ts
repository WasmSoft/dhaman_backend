import { ErrorCode } from '../../../common/enums/error-code.enum';
import { AppException } from '../../../common/errors/app-exception';
import { ReviewResult } from './review-context.types';

const ALLOWED_RECOMMENDATIONS = new Set<ReviewResult['recommendation']>([
  'ACCEPT',
  'REJECT',
  'PARTIAL',
  'NEEDS_HUMAN_REVIEW',
]);

const ALLOWED_KEYS = [
  'matchScore',
  'recommendation',
  'completedCriteria',
  'missingCriteria',
  'outOfScopeItems',
  'reasoning',
] as const;

function invalidResponse(
  message: string,
  details: Record<string, unknown>,
): never {
  throw new AppException({
    code: ErrorCode.AI_INVALID_RESPONSE,
    message,
    details,
  });
}

function stripSingleJsonFence(raw: string): string {
  const trimmed = raw.trim();

  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  const match = trimmed.match(/^```(?:json|JSON)?\s*([\s\S]*?)\s*```$/);

  if (!match || match[1].includes('```')) {
    invalidResponse('AI response markdown fence is invalid.', {
      step: 'stripSingleJsonFence',
    });
  }

  return match[1].trim();
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function hasOnlyAllowedKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);

  return (
    keys.length === ALLOWED_KEYS.length &&
    keys.every((key) => ALLOWED_KEYS.includes(key as (typeof ALLOWED_KEYS)[number]))
  );
}

export function parseReviewResponse(raw: string): ReviewResult {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    invalidResponse('AI response must be a non-empty string.', {
      step: 'raw',
    });
  }

  const cleaned = stripSingleJsonFence(raw);

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    invalidResponse('AI response is not valid JSON.', {
      step: 'JSON.parse',
    });
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    invalidResponse('AI response root must be an object.', {
      step: 'rootObject',
    });
  }

  const result = parsed as Record<string, unknown>;

  if (!hasOnlyAllowedKeys(result)) {
    invalidResponse('AI response contains invalid fields.', {
      step: 'allowedKeys',
    });
  }

  if (typeof result.matchScore !== 'number' || !Number.isFinite(result.matchScore)) {
    invalidResponse('AI response matchScore must be a finite number.', {
      step: 'matchScoreType',
      field: 'matchScore',
    });
  }

  if (result.matchScore < 0 || result.matchScore > 100) {
    invalidResponse('AI response matchScore must be between 0 and 100.', {
      step: 'matchScoreRange',
      field: 'matchScore',
    });
  }

  if (
    typeof result.recommendation !== 'string' ||
    !ALLOWED_RECOMMENDATIONS.has(result.recommendation as ReviewResult['recommendation'])
  ) {
    invalidResponse('AI response recommendation is invalid.', {
      step: 'recommendation',
      field: 'recommendation',
    });
  }

  if (!isStringArray(result.completedCriteria)) {
    invalidResponse('AI response completedCriteria must be a string array.', {
      step: 'completedCriteria',
      field: 'completedCriteria',
    });
  }

  if (!isStringArray(result.missingCriteria)) {
    invalidResponse('AI response missingCriteria must be a string array.', {
      step: 'missingCriteria',
      field: 'missingCriteria',
    });
  }

  if (!isStringArray(result.outOfScopeItems)) {
    invalidResponse('AI response outOfScopeItems must be a string array.', {
      step: 'outOfScopeItems',
      field: 'outOfScopeItems',
    });
  }

  if (typeof result.reasoning !== 'string' || result.reasoning.trim().length === 0) {
    invalidResponse('AI response reasoning must be a non-empty string.', {
      step: 'reasoning',
      field: 'reasoning',
    });
  }

  return {
    matchScore: result.matchScore,
    recommendation: result.recommendation as ReviewResult['recommendation'],
    completedCriteria: result.completedCriteria,
    missingCriteria: result.missingCriteria,
    outOfScopeItems: result.outOfScopeItems,
    reasoning: result.reasoning.trim(),
  };
}
