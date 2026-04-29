import { createReviewContextFixture } from './review-helper-fixtures';
import {
  generateMockReview,
  parseReviewResponse,
} from '../../modules/ai-review/helpers';

describe('generateMockReview', () => {
  it('returns a fixed partial review for five acceptance criteria', () => {
    const context = createReviewContextFixture();

    expect(generateMockReview(context)).toEqual({
      matchScore: 72,
      recommendation: 'PARTIAL',
      completedCriteria: [
        'Responsive layout matches the approved design',
        'Portfolio section is visible on mobile',
        'Brand colors match the style guide',
      ],
      missingCriteria: [
        'Contact form works correctly',
        'Performance remains acceptable on mobile',
      ],
      outOfScopeItems: [
        'عنصر إضافي خارج نطاق العمل تم رصده في المراجعة التجريبية.',
      ],
      reasoning:
        'التسليم يحقق جزءاً من معايير القبول، لكنه يحتاج إلى استكمال بعض البنود قبل التوصية بالقبول الكامل.',
    });
  });

  it('rounds the completed criteria split for three acceptance criteria', () => {
    const context = createReviewContextFixture({
      milestone: {
        ...createReviewContextFixture().milestone,
        acceptanceCriteria: ['One', 'Two', 'Three'],
      },
    });

    expect(generateMockReview(context)).toMatchObject({
      completedCriteria: ['One', 'Two'],
      missingCriteria: ['Three'],
    });
  });

  it('returns empty criteria arrays when the milestone has no criteria', () => {
    const context = createReviewContextFixture({
      milestone: {
        ...createReviewContextFixture().milestone,
        acceptanceCriteria: [],
      },
    });

    expect(generateMockReview(context)).toMatchObject({
      completedCriteria: [],
      missingCriteria: [],
      outOfScopeItems: [
        'عنصر إضافي خارج نطاق العمل تم رصده في المراجعة التجريبية.',
      ],
    });
  });

  it('is deterministic for repeated calls with the same context', () => {
    const context = createReviewContextFixture();

    expect(generateMockReview(context)).toEqual(generateMockReview(context));
  });

  it('returns Arabic reasoning and placeholder text for Arabic locale', () => {
    const context = createReviewContextFixture({ locale: 'ar' });

    expect(generateMockReview(context)).toMatchObject({
      reasoning:
        'التسليم يحقق جزءاً من معايير القبول، لكنه يحتاج إلى استكمال بعض البنود قبل التوصية بالقبول الكامل.',
      outOfScopeItems: [
        'عنصر إضافي خارج نطاق العمل تم رصده في المراجعة التجريبية.',
      ],
    });
  });

  it('returns English reasoning and placeholder text for English locale', () => {
    const context = createReviewContextFixture({ locale: 'en' });

    expect(generateMockReview(context)).toMatchObject({
      reasoning:
        'The delivery meets part of the acceptance criteria, but some items still need completion before full acceptance.',
      outOfScopeItems: [
        'Additional out-of-scope item identified by the mock review.',
      ],
    });
  });

  it('always keeps matchScore at 72 and recommendation at PARTIAL', () => {
    const context = createReviewContextFixture();

    expect(generateMockReview(context)).toMatchObject({
      matchScore: 72,
      recommendation: 'PARTIAL',
    });
  });

  it('always returns exactly one out-of-scope item', () => {
    const context = createReviewContextFixture();

    expect(generateMockReview(context).outOfScopeItems).toHaveLength(1);
  });

  it('returns output that the parser accepts without errors', () => {
    const context = createReviewContextFixture();

    expect(
      parseReviewResponse(JSON.stringify(generateMockReview(context))),
    ).toEqual(generateMockReview(context));
  });
});
