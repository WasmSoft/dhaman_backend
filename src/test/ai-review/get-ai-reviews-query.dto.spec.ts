import { AIReviewStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { GetAiReviewsQueryDto } from '../../modules/ai-review/dto';

async function validateDto(
  payload: Record<string, unknown>,
): Promise<ValidationError[]> {
  return validate(plainToInstance(GetAiReviewsQueryDto, payload));
}

function constraintsFor(
  errors: ValidationError[],
  property: string,
): Record<string, string> {
  return errors.find((error) => error.property === property)?.constraints ?? {};
}

describe('GetAiReviewsQueryDto', () => {
  it('accepts an empty query', async () => {
    const errors = await validateDto({});

    expect(errors).toHaveLength(0);
  });

  it('rejects a non-UUID agreementId', async () => {
    const errors = await validateDto({ agreementId: 'agreement-123' });

    expect(constraintsFor(errors, 'agreementId')).toHaveProperty('isUuid');
  });

  it('rejects a status outside the AIReviewStatus enum', async () => {
    const errors = await validateDto({ status: 'UNKNOWN' });

    expect(constraintsFor(errors, 'status')).toHaveProperty('isEnum');
  });

  it('accepts a valid AIReviewStatus value', async () => {
    const errors = await validateDto({ status: AIReviewStatus.PENDING });

    expect(errors).toHaveLength(0);
  });

  it('rejects page values lower than 1', async () => {
    const errors = await validateDto({ page: 0 });

    expect(constraintsFor(errors, 'page')).toHaveProperty('min');
  });

  it('rejects limit values lower than 1', async () => {
    const errors = await validateDto({ limit: 0 });

    expect(constraintsFor(errors, 'limit')).toHaveProperty('min');
  });

  it('rejects limit values greater than 50', async () => {
    const errors = await validateDto({ limit: 51 });

    expect(constraintsFor(errors, 'limit')).toHaveProperty('max');
  });

  it('accepts page 1 and limit 20', async () => {
    const errors = await validateDto({ page: 1, limit: 20 });

    expect(errors).toHaveLength(0);
  });

  it('coerces string-encoded page and limit values to numbers', async () => {
    const instance = plainToInstance(GetAiReviewsQueryDto, {
      page: '2',
      limit: '20',
    });

    const errors = await validate(instance);

    expect(errors).toHaveLength(0);
    expect(instance.page).toBe(2);
    expect(instance.limit).toBe(20);
  });
});
