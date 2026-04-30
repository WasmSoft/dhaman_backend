import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { UpdateDefaultPoliciesDto } from '../../modules/settings/dto/update-default-policies.dto';
import { UpdateSettingsDto } from '../../modules/settings/dto/update-settings.dto';

async function validateDto<T extends object>(
  dto: new () => T,
  payload: Record<string, unknown>,
): Promise<ValidationError[]> {
  return validate(plainToInstance(dto, payload));
}

function constraintsFor(
  errors: ValidationError[],
  property: string,
): Record<string, string> {
  return errors.find((error) => error.property === property)?.constraints ?? {};
}

describe('Settings DTO validation', () => {
  describe('UpdateSettingsDto', () => {
    it('accepts a valid general settings payload', async () => {
      const errors = await validateDto(UpdateSettingsDto, {
        defaultCurrency: 'USD',
        defaultServiceType: 'Logo Design',
        aiStrictness: 'balanced',
        emailNotificationsEnabled: true,
      });

      expect(errors).toHaveLength(0);
    });

    it('rejects lowercase defaultCurrency', async () => {
      const errors = await validateDto(UpdateSettingsDto, {
        defaultCurrency: 'usd',
      });

      expect(constraintsFor(errors, 'defaultCurrency')).toHaveProperty(
        'matches',
      );
    });

    it('rejects unsupported aiStrictness values', async () => {
      const errors = await validateDto(UpdateSettingsDto, {
        aiStrictness: 'aggressive',
      });

      expect(constraintsFor(errors, 'aiStrictness')).toHaveProperty('isIn');
    });

    it('rejects non-boolean emailNotificationsEnabled values', async () => {
      const errors = await validateDto(UpdateSettingsDto, {
        emailNotificationsEnabled: 'yes',
      });

      expect(
        constraintsFor(errors, 'emailNotificationsEnabled'),
      ).toHaveProperty('isBoolean');
    });

    it('rejects values that exceed defaultCurrency and service type limits', async () => {
      const errors = await validateDto(UpdateSettingsDto, {
        defaultCurrency: 'ABCDEFGHIJK',
        defaultServiceType: 'S'.repeat(121),
      });

      expect(constraintsFor(errors, 'defaultCurrency')).toHaveProperty(
        'maxLength',
      );
      expect(constraintsFor(errors, 'defaultServiceType')).toHaveProperty(
        'maxLength',
      );
    });
  });

  describe('UpdateDefaultPoliciesDto', () => {
    it('accepts valid default policy strings', async () => {
      const errors = await validateDto(UpdateDefaultPoliciesDto, {
        defaultDelayPolicy: 'Delay policy',
        defaultCancellationPolicy: 'Cancellation policy',
        defaultExtraRequestPolicy: 'Extra request policy',
        defaultReviewPolicy: 'Review policy',
      });

      expect(errors).toHaveLength(0);
    });

    it('rejects policy values longer than 3000 characters', async () => {
      const errors = await validateDto(UpdateDefaultPoliciesDto, {
        defaultDelayPolicy: 'D'.repeat(3001),
      });

      expect(constraintsFor(errors, 'defaultDelayPolicy')).toHaveProperty(
        'maxLength',
      );
    });
  });
});
