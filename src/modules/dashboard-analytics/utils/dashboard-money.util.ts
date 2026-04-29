import { Prisma } from '@prisma/client';

export function serializeDashboardMoney(value: unknown): string {
  if (value === null || value === undefined) {
    return '0.00';
  }

  if (value instanceof Prisma.Decimal) {
    return value.toFixed(2);
  }

  if (typeof value === 'string') {
    return new Prisma.Decimal(value).toFixed(2);
  }

  if (typeof value === 'number') {
    return new Prisma.Decimal(value.toString()).toFixed(2);
  }

  return new Prisma.Decimal(String(value)).toFixed(2);
}
