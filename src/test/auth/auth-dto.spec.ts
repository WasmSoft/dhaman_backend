import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { LoginDto, RegisterDto } from '../../modules/auth/dto';

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

describe('Auth DTO validation', () => {
  describe('RegisterDto', () => {
    it('accepts a valid registration payload', async () => {
      const errors = await validateDto(RegisterDto, {
        email: 'sara@example.com',
        name: 'Sara Ahmed',
        password: 'Str0ngPassw0rd!',
      });

      expect(errors).toHaveLength(0);
    });

    it('rejects invalid email, short password, and missing name', async () => {
      const errors = await validateDto(RegisterDto, {
        email: 'not-an-email',
        password: 'short',
      });

      expect(constraintsFor(errors, 'email')).toHaveProperty('isEmail');
      expect(constraintsFor(errors, 'password')).toHaveProperty('minLength');
      expect(constraintsFor(errors, 'name')).toHaveProperty('isString');
      expect(constraintsFor(errors, 'name')).toHaveProperty('minLength');
    });

    it('rejects values beyond registration length limits', async () => {
      const errors = await validateDto(RegisterDto, {
        email: 'sara@example.com',
        name: 'S'.repeat(101),
        password: 'P'.repeat(129),
      });

      expect(constraintsFor(errors, 'name')).toHaveProperty('maxLength');
      expect(constraintsFor(errors, 'password')).toHaveProperty('maxLength');
    });
  });

  describe('LoginDto', () => {
    it('accepts a valid login payload', async () => {
      const errors = await validateDto(LoginDto, {
        email: 'sara@example.com',
        password: 'Str0ngPassw0rd!',
      });

      expect(errors).toHaveLength(0);
    });

    it('rejects missing email and password', async () => {
      const errors = await validateDto(LoginDto, {});

      expect(constraintsFor(errors, 'email')).toHaveProperty('isEmail');
      expect(constraintsFor(errors, 'password')).toHaveProperty('isString');
      expect(constraintsFor(errors, 'password')).toHaveProperty('minLength');
    });
  });
});
