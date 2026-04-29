import { Prisma } from '@prisma/client';
import {
  BuildReviewContextInput,
  ReviewContext,
  ReviewResult,
} from '../../modules/ai-review/helpers';

export function createBuildReviewContextInputFixture(
  overrides: Partial<BuildReviewContextInput> = {},
): BuildReviewContextInput {
  return {
    agreement: {
      title: 'Website redesign agreement',
      description: 'Redesign the marketing website with mobile support.',
      serviceType: 'Web Design',
      currency: 'SAR',
      policy: {
        delayPolicy: 'Late delivery reduces the review period by one day.',
        cancellationPolicy:
          'Cancellation after approval requires mutual agreement.',
        extraRequestPolicy:
          'Extra work outside the milestone must be agreed separately.',
        reviewPolicy:
          'The client reviews the delivery against the acceptance criteria only.',
        clientReviewPeriodDays: 5,
        freelancerDelayGraceDays: 2,
      },
      ...overrides.agreement,
    },
    milestone: {
      title: 'Responsive landing page',
      description: 'Build the landing page and mobile layout.',
      amount: new Prisma.Decimal('1500.50'),
      currency: 'SAR',
      acceptanceCriteria: [
        'Responsive layout matches the approved design',
        'Portfolio section is visible on mobile',
        'Brand colors match the style guide',
        'Contact form works correctly',
        'Performance remains acceptable on mobile',
      ],
      revisionLimit: 2,
      ...overrides.milestone,
    },
    delivery: {
      summary: 'Initial landing page delivery with mobile layout updates.',
      notes: 'Header and footer are complete, but the portfolio section needs review.',
      deliveryUrl: 'https://example.com/delivery/landing-page',
      fileUrl: 'https://example.com/files/final-design.pdf',
      fileName: 'final-design.pdf',
      fileType: 'application/pdf',
      ...overrides.delivery,
    },
    objection:
      'The portfolio section is missing on mobile and the colors do not fully match the agreed style guide.',
    relatedCriteria: [
      'Portfolio section is visible on mobile',
      'Brand colors match the style guide',
    ],
    locale: 'ar',
    ...overrides,
  };
}

export function createReviewContextFixture(
  overrides: Partial<ReviewContext> = {},
): ReviewContext {
  const base: ReviewContext = {
    agreement: {
      title: 'Website redesign agreement',
      description: 'Redesign the marketing website with mobile support.',
      serviceType: 'Web Design',
      currency: 'SAR',
    },
    policies: [
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
        clause: 'The client reviews the delivery against the acceptance criteria only.',
        rules: { clientReviewPeriodDays: 5 },
      },
    ],
    milestone: {
      title: 'Responsive landing page',
      description: 'Build the landing page and mobile layout.',
      amount: '1500.50',
      currency: 'SAR',
      acceptanceCriteria: [
        'Responsive layout matches the approved design',
        'Portfolio section is visible on mobile',
        'Brand colors match the style guide',
        'Contact form works correctly',
        'Performance remains acceptable on mobile',
      ],
      revisionLimit: 2,
    },
    delivery: {
      summary: 'Initial landing page delivery with mobile layout updates.',
      notes: 'Header and footer are complete, but the portfolio section needs review.',
      evidence: [
        {
          kind: 'url',
          ref: 'https://example.com/delivery/landing-page',
        },
        {
          kind: 'file',
          ref: 'https://example.com/files/final-design.pdf',
          fileName: 'final-design.pdf',
          fileType: 'application/pdf',
        },
      ],
    },
    objection:
      'The portfolio section is missing on mobile and the colors do not fully match the agreed style guide.',
    relatedCriteria: [
      'Portfolio section is visible on mobile',
      'Brand colors match the style guide',
    ],
    locale: 'ar',
  };

  return {
    ...base,
    ...overrides,
    agreement: { ...base.agreement, ...overrides.agreement },
    milestone: { ...base.milestone, ...overrides.milestone },
    delivery: { ...base.delivery, ...overrides.delivery },
    policies: overrides.policies ?? base.policies,
    relatedCriteria: overrides.relatedCriteria ?? base.relatedCriteria,
  };
}

export function createReviewResultFixture(
  overrides: Partial<ReviewResult> = {},
): ReviewResult {
  return {
    matchScore: 72,
    recommendation: 'PARTIAL',
    completedCriteria: [
      'Responsive layout matches the approved design',
      'Portfolio section is visible on mobile',
    ],
    missingCriteria: ['Brand colors match the style guide'],
    outOfScopeItems: ['Add a new login system'],
    reasoning: 'التسليم يحقق جزءاً من المعايير لكنه لا يحققها كلها بشكل كامل.',
    ...overrides,
  };
}
