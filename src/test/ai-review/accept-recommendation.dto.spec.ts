import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { AcceptRecommendationDto } from '../../modules/ai-review/dto';

async function validateDto(
  payload: Record<string, unknown>,
): Promise<ValidationError[]> {
  return validate(plainToInstance(AcceptRecommendationDto, payload));
}

function constraintsFor(
  errors: ValidationError[],
  property: string,
): Record<string, string> {
  return errors.find((error) => error.property === property)?.constraints ?? {};
}

describe('AcceptRecommendationDto', () => {
  it('accepts an empty body', async () => {
    const errors = await validateDto({});

    expect(errors).toHaveLength(0);
  });

  it('accepts createChangeRequests set to true', async () => {
    const errors = await validateDto({ createChangeRequests: true });

    expect(errors).toHaveLength(0);
  });

  it('accepts createChangeRequests set to false', async () => {
    const errors = await validateDto({ createChangeRequests: false });

    expect(errors).toHaveLength(0);
  });

  it('rejects string values for createChangeRequests', async () => {
    const errors = await validateDto({ createChangeRequests: 'yes' });

    expect(constraintsFor(errors, 'createChangeRequests')).toHaveProperty(
      'isBoolean',
    );
  });

  it('rejects numeric values for createChangeRequests', async () => {
    const errors = await validateDto({ createChangeRequests: 1 });

    expect(constraintsFor(errors, 'createChangeRequests')).toHaveProperty(
      'isBoolean',
    );
  });
});
