export function toIsoDate(value: Date | string): string {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

export function isValidDateInput(value: unknown): boolean {
  if (typeof value !== 'string' && !(value instanceof Date)) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}
