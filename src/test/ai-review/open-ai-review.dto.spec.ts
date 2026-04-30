import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { OpenAiReviewDto } from '../../modules/ai-review/dto';

async function validateDto(
  payload: Record<string, unknown>,
): Promise<ValidationError[]> {
  return validate(plainToInstance(OpenAiReviewDto, payload));
}

function constraintsFor(
  errors: ValidationError[],
  property: string,
): Record<string, string> {
  return errors.find((error) => error.property === property)?.constraints ?? {};
}

describe('OpenAiReviewDto', () => {
  it('accepts a valid objection within the allowed range', async () => {
    const errors = await validateDto({
      objection: 'The portfolio section is missing from the mobile layout.',
      relatedCriteria: ['responsive layout', 'portfolio section'],
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects objections shorter than 10 characters', async () => {
    const errors = await validateDto({ objection: 'too short' });

    expect(constraintsFor(errors, 'objection')).toHaveProperty('minLength');
  });

  it('rejects objections longer than 2000 characters', async () => {
    const errors = await validateDto({ objection: 'a'.repeat(2001) });

    expect(constraintsFor(errors, 'objection')).toHaveProperty('maxLength');
  });

  it('accepts an omitted relatedCriteria array', async () => {
    const errors = await validateDto({
      objection:
        'The final delivery does not match the agreed acceptance criteria.',
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects non-string items in relatedCriteria', async () => {
    const errors = await validateDto({
      objection:
        'The final delivery does not match the agreed acceptance criteria.',
      relatedCriteria: ['responsive layout', 5],
    });

    expect(constraintsFor(errors, 'relatedCriteria')).toHaveProperty(
      'isString',
    );
  });

  it('rejects relatedCriteria arrays longer than 50 items', async () => {
    const errors = await validateDto({
      objection:
        'The final delivery does not match the agreed acceptance criteria.',
      relatedCriteria: Array.from(
        { length: 51 },
        (_, index) => `criterion-${index}`,
      ),
    });

    expect(constraintsFor(errors, 'relatedCriteria')).toHaveProperty(
      'arrayMaxSize',
    );
  });
});
