import { ReviewContext, ReviewResult } from './review-context.types';

const ARABIC_REASONING =
  'التسليم يحقق جزءاً من معايير القبول، لكنه يحتاج إلى استكمال بعض البنود قبل التوصية بالقبول الكامل.';
const ENGLISH_REASONING =
  'The delivery meets part of the acceptance criteria, but some items still need completion before full acceptance.';
const ARABIC_OUT_OF_SCOPE =
  'عنصر إضافي خارج نطاق العمل تم رصده في المراجعة التجريبية.';
const ENGLISH_OUT_OF_SCOPE =
  'Additional out-of-scope item identified by the mock review.';

export function generateMockReview(context: ReviewContext): ReviewResult {
  const criteria = context.milestone.acceptanceCriteria;
  const completedCount = Math.round(criteria.length * 0.6);

  return {
    matchScore: 72,
    recommendation: 'PARTIAL',
    completedCriteria: criteria.slice(0, completedCount),
    missingCriteria: criteria.slice(completedCount),
    outOfScopeItems: [
      context.locale === 'en' ? ENGLISH_OUT_OF_SCOPE : ARABIC_OUT_OF_SCOPE,
    ],
    reasoning: context.locale === 'en' ? ENGLISH_REASONING : ARABIC_REASONING,
  };
}
