import { Prisma } from '@prisma/client';
import {
  buildReviewContext,
  BuildReviewContextInput,
} from '../../modules/ai-review/helpers';
import { createBuildReviewContextInputFixture } from './review-helper-fixtures';

describe('buildReviewContext', () => {
  it('serializes Decimal-like milestone amounts as strings', () => {
    const input = createBuildReviewContextInputFixture({
      milestone: {
        ...createBuildReviewContextInputFixture().milestone,
        amount: new Prisma.Decimal('1500.50'),
      },
    });

    expect(buildReviewContext(input).milestone.amount).toBe('1500.50');
  });

  it('normalizes null delivery notes and missing evidence to empty values', () => {
    const input = createBuildReviewContextInputFixture({
      delivery: {
        ...createBuildReviewContextInputFixture().delivery,
        notes: null,
        deliveryUrl: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
      },
    });

    expect(buildReviewContext(input).delivery).toEqual({
      summary: 'Initial landing page delivery with mobile layout updates.',
      notes: '',
      evidence: [],
    });
  });

  it('passes all four policies through in a stable order', () => {
    const context = buildReviewContext(createBuildReviewContextInputFixture());

    expect(context.policies).toEqual([
      {
        type: 'delay',
        clause: 'Late delivery reduces the review period by one day.',
        rules: { freelancerDelayGraceDays: 2 },
      },
      {
        type: 'cancellation',
        clause: 'Cancellation after approval requires mutual agreement.',
      },
      {
        type: 'extraRequest',
        clause: 'Extra work outside the milestone must be agreed separately.',
      },
      {
        type: 'review',
        clause:
          'The client reviews the delivery against the acceptance criteria only.',
        rules: { clientReviewPeriodDays: 5 },
      },
    ]);
  });

  it('returns an empty policy array when no policy exists', () => {
    const input = createBuildReviewContextInputFixture({
      agreement: {
        ...createBuildReviewContextInputFixture().agreement,
        policy: null,
      },
    });

    expect(buildReviewContext(input).policies).toEqual([]);
  });

  it('passes relatedCriteria through unchanged when provided', () => {
    const input = createBuildReviewContextInputFixture({
      relatedCriteria: ['Criterion A', 'Criterion B'],
    });

    expect(buildReviewContext(input).relatedCriteria).toEqual([
      'Criterion A',
      'Criterion B',
    ]);
  });

  it('defaults relatedCriteria to an empty array when omitted', () => {
    const input = createBuildReviewContextInputFixture();
    delete input.relatedCriteria;

    expect(buildReviewContext(input).relatedCriteria).toEqual([]);
  });

  it('defaults locale to ar when not provided', () => {
    const input = createBuildReviewContextInputFixture();
    delete input.locale;

    expect(buildReviewContext(input).locale).toBe('ar');
  });

  it('passes through the English locale when it is provided', () => {
    const input = createBuildReviewContextInputFixture({ locale: 'en' });

    expect(buildReviewContext(input).locale).toBe('en');
  });

  it('does not expose internal ids when extra input fields exist', () => {
    const input =
      createBuildReviewContextInputFixture() as BuildReviewContextInput & {
        agreement: BuildReviewContextInput['agreement'] & { id: string };
        delivery: BuildReviewContextInput['delivery'] & { providerId: string };
      };

    input.agreement.id = 'agreement-internal-id';
    input.delivery.providerId = 'provider-internal-id';

    const context = buildReviewContext(input);

    expect(context.agreement).not.toHaveProperty('id');
    expect(context.delivery).not.toHaveProperty('providerId');
  });

  it('normalizes a non-array acceptanceCriteria value to an empty array', () => {
    const input = createBuildReviewContextInputFixture({
      milestone: {
        ...createBuildReviewContextInputFixture().milestone,
        acceptanceCriteria: 'not-an-array',
      },
    });

    expect(buildReviewContext(input).milestone.acceptanceCriteria).toEqual([]);
  });
});
