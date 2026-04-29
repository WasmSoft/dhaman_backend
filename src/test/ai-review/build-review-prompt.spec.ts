import { buildReviewPrompt } from '../../modules/ai-review/helpers';
import { createReviewContextFixture } from './review-helper-fixtures';

describe('buildReviewPrompt', () => {
  it('includes every core context block and every acceptance criterion', () => {
    const prompt = buildReviewPrompt(createReviewContextFixture());

    expect(prompt).toContain('Website redesign agreement');
    expect(prompt).toContain('Responsive landing page');
    expect(prompt).toContain('Responsive layout matches the approved design');
    expect(prompt).toContain('Portfolio section is visible on mobile');
    expect(prompt).toContain('Brand colors match the style guide');
    expect(prompt).toContain('Contact form works correctly');
    expect(prompt).toContain('Performance remains acceptable on mobile');
    expect(prompt).toContain(
      'Late delivery reduces the review period by one day.',
    );
    expect(prompt).toContain(
      'Cancellation after approval requires mutual agreement.',
    );
    expect(prompt).toContain(
      'Extra work outside the milestone must be agreed separately.',
    );
    expect(prompt).toContain(
      'The client reviews the delivery against the acceptance criteria only.',
    );
    expect(prompt).toContain('https://example.com/delivery/landing-page');
    expect(prompt).toContain('https://example.com/files/final-design.pdf');
    expect(prompt).toContain(
      'The portfolio section is missing on mobile and the colors do not fully match the agreed style guide.',
    );
  });

  it('is byte-identical for repeated calls with the same context', () => {
    const context = createReviewContextFixture();

    expect(buildReviewPrompt(context)).toBe(buildReviewPrompt(context));
  });

  it('instructs Arabic reasoning when the locale is Arabic', () => {
    const prompt = buildReviewPrompt(
      createReviewContextFixture({ locale: 'ar' }),
    );

    expect(prompt).toContain('Write the reasoning text in Arabic.');
    expect(prompt).toContain('Keep JSON keys in English.');
  });

  it('instructs English reasoning when the locale is English', () => {
    const prompt = buildReviewPrompt(
      createReviewContextFixture({ locale: 'en' }),
    );

    expect(prompt).toContain('Write the reasoning text in English.');
    expect(prompt).toContain('Keep JSON keys in English.');
  });

  it('uses explicit empty text when no policies are provided', () => {
    const prompt = buildReviewPrompt(
      createReviewContextFixture({ policies: [] }),
    );

    expect(prompt).toContain('No policies provided.');
  });

  it('uses explicit empty text when no related criteria are provided', () => {
    const prompt = buildReviewPrompt(
      createReviewContextFixture({ relatedCriteria: [] }),
    );

    expect(prompt).toContain('No related criteria specified.');
  });

  it('uses short direct phrases that are easier for a cheaper AI model to follow', () => {
    const prompt = buildReviewPrompt(createReviewContextFixture());

    expect(prompt).toContain('Return JSON only.');
    expect(prompt).toContain('Use only the information below.');
    expect(prompt).toContain('Do not add text before or after JSON.');
    expect(prompt).toContain('Keep JSON keys in English.');
  });

  it('lists the schema fields, recommendation values, and threshold rules explicitly', () => {
    const prompt = buildReviewPrompt(createReviewContextFixture());

    expect(prompt).toContain('JSON');
    expect(prompt).toContain('matchScore');
    expect(prompt).toContain('recommendation');
    expect(prompt).toContain('completedCriteria');
    expect(prompt).toContain('missingCriteria');
    expect(prompt).toContain('outOfScopeItems');
    expect(prompt).toContain('reasoning');
    expect(prompt).toContain('ACCEPT');
    expect(prompt).toContain('REJECT');
    expect(prompt).toContain('PARTIAL');
    expect(prompt).toContain('NEEDS_HUMAN_REVIEW');
    expect(prompt).toContain('> 80 -> ACCEPT');
    expect(prompt).toContain('< 40 -> REJECT');
    expect(prompt).toContain('40-80 -> PARTIAL');
    expect(prompt).toContain('ambiguous -> NEEDS_HUMAN_REVIEW');
  });
});
