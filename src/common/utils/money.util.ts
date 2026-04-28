export function normalizeAmount(value: number | string): number {
  const numericValue = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(numericValue) ? Number(numericValue.toFixed(2)) : 0;
}
