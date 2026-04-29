import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { Locale } from '../../../common/enums/locale.enum';
import { errorMessagesAr } from '../../../common/errors/error-messages.ar';
import { errorMessagesEn } from '../../../common/errors/error-messages.en';
import { serializeDashboardMoney } from '../utils/dashboard-money.util';

export async function validateDto<T extends object>(
  dtoClass: ClassConstructor<T>,
  payload: Record<string, unknown>,
): Promise<ValidationError[]> {
  const dto = plainToInstance(dtoClass, payload);

  return validate(dto);
}

export function readErrorTranslation(code: ErrorCode, locale: Locale): string {
  const message =
    locale === Locale.AR ? errorMessagesAr[code] : errorMessagesEn[code];

  if (!message) {
    throw new Error(
      `Missing translation for error code ${code} in locale ${locale}`,
    );
  }

  return message;
}

export function assertMoneyString(
  actual: unknown,
  expectedDecimal: Prisma.Decimal,
): void {
  if (typeof actual !== 'string') {
    throw new Error(
      `Expected money value to be a string, but got ${typeof actual}`,
    );
  }

  const expected = serializeDashboardMoney(expectedDecimal);

  if (actual !== expected) {
    throw new Error(`Expected money string "${expected}", but got "${actual}"`);
  }
}
