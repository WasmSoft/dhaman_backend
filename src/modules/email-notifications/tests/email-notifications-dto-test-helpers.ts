import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';

export async function validateDto<T extends object>(
  dtoClass: ClassConstructor<T>,
  payload: Record<string, unknown>,
): Promise<ValidationError[]> {
  const dto = plainToInstance(dtoClass, payload);

  return validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: false,
  });
}

export function findPropertyError(
  errors: ValidationError[],
  property: string,
): void {
  const properties = errors.map((error) => error.property);
  expect(properties).toContain(property);
}
