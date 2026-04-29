import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { ReviewPaymentReleaseDto } from '../../modules/ai-review/dto';

const VALID_UUIDS = {
  agreementId: 'f7c5b8d4-2c1a-4d2c-9d5e-2a4b6c8d0e2f',
  milestoneId: 'a1b2c3d4-e5f6-4890-9234-567890abcdef',
  deliveryId: '0fed4321-09bc-4654-8210-fedcba987654',
} as const;

async function validateDto(
  payload: Record<string, unknown>,
): Promise<ValidationError[]> {
  return validate(plainToInstance(ReviewPaymentReleaseDto, payload));
}

function constraintsFor(
  errors: ValidationError[],
  property: string,
): Record<string, string> {
  return errors.find((error) => error.property === property)?.constraints ?? {};
}

describe('ReviewPaymentReleaseDto', () => {
  it('accepts a valid payload with UUID v4 ids', async () => {
    const errors = await validateDto({
      ...VALID_UUIDS,
      objection:
        'The delivery appears ready, but I want an AI review before release.',
      relatedCriteria: ['performance budget', 'RTL support'],
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects a missing agreementId', async () => {
    const errors = await validateDto({
      milestoneId: VALID_UUIDS.milestoneId,
      deliveryId: VALID_UUIDS.deliveryId,
      objection:
        'The delivery appears ready, but I want an AI review before release.',
    });

    const constraints = constraintsFor(errors, 'agreementId');
    expect(
      constraints.isUuid ?? constraints.isString ?? constraints.isUuidVersion,
    ).toBeDefined();
  });

  it('rejects a missing milestoneId', async () => {
    const errors = await validateDto({
      agreementId: VALID_UUIDS.agreementId,
      deliveryId: VALID_UUIDS.deliveryId,
      objection:
        'The delivery appears ready, but I want an AI review before release.',
    });

    const constraints = constraintsFor(errors, 'milestoneId');
    expect(
      constraints.isUuid ?? constraints.isString ?? constraints.isUuidVersion,
    ).toBeDefined();
  });

  it('rejects a missing deliveryId', async () => {
    const errors = await validateDto({
      agreementId: VALID_UUIDS.agreementId,
      milestoneId: VALID_UUIDS.milestoneId,
      objection:
        'The delivery appears ready, but I want an AI review before release.',
    });

    const constraints = constraintsFor(errors, 'deliveryId');
    expect(
      constraints.isUuid ?? constraints.isString ?? constraints.isUuidVersion,
    ).toBeDefined();
  });

  it('rejects a non-UUID deliveryId', async () => {
    const errors = await validateDto({
      agreementId: VALID_UUIDS.agreementId,
      milestoneId: VALID_UUIDS.milestoneId,
      deliveryId: 'delivery-123',
      objection:
        'The delivery appears ready, but I want an AI review before release.',
    });

    expect(constraintsFor(errors, 'deliveryId')).toHaveProperty('isUuid');
  });

  it('rejects objections shorter than 10 characters', async () => {
    const errors = await validateDto({
      ...VALID_UUIDS,
      objection: 'too short',
    });

    expect(constraintsFor(errors, 'objection')).toHaveProperty('minLength');
  });

  it('rejects objections longer than 2000 characters', async () => {
    const errors = await validateDto({
      ...VALID_UUIDS,
      objection: 'a'.repeat(2001),
    });

    expect(constraintsFor(errors, 'objection')).toHaveProperty('maxLength');
  });

  it('accepts an omitted relatedCriteria array', async () => {
    const errors = await validateDto({
      ...VALID_UUIDS,
      objection:
        'The delivery appears ready, but I want an AI review before release.',
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects non-string items in relatedCriteria', async () => {
    const errors = await validateDto({
      ...VALID_UUIDS,
      objection:
        'The delivery appears ready, but I want an AI review before release.',
      relatedCriteria: ['performance budget', 3],
    });

    expect(constraintsFor(errors, 'relatedCriteria')).toHaveProperty(
      'isString',
    );
  });

  it('rejects relatedCriteria arrays longer than 50 items', async () => {
    const errors = await validateDto({
      ...VALID_UUIDS,
      objection:
        'The delivery appears ready, but I want an AI review before release.',
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
