import { Prisma } from '@prisma/client';
import { serializeDashboardMoney } from '../utils/dashboard-money.util';
import { decimal } from './dashboard-service-test-helpers';

describe('dashboard money serializer', () => {
  it('serializes Prisma Decimal values as exact strings', () => {
    expect(serializeDashboardMoney(decimal('1250.00'))).toBe('1250.00');
    expect(serializeDashboardMoney(decimal('0.10'))).toBe('0.10');
  });

  it('returns 0.00 for null or undefined values', () => {
    expect(serializeDashboardMoney(null)).toBe('0.00');
    expect(serializeDashboardMoney(undefined)).toBe('0.00');
  });

  it('covers decimal precision boundaries used by the mixed-statuses fixture', () => {
    // High precision
    expect(serializeDashboardMoney(decimal('1250.5555'))).toBe('1250.56');

    // Zero
    expect(serializeDashboardMoney(decimal('0.00'))).toBe('0.00');

    // Very large
    expect(serializeDashboardMoney(decimal('999999.99'))).toBe('999999.99');

    // Tiny fraction
    expect(serializeDashboardMoney(decimal('0.001'))).toBe('0.00');

    // From number
    expect(serializeDashboardMoney(123.45)).toBe('123.45');

    // From string
    expect(serializeDashboardMoney('987.65')).toBe('987.65');

    // From Prisma.Decimal directly
    expect(serializeDashboardMoney(new Prisma.Decimal('555.55'))).toBe(
      '555.55',
    );
  });
});
