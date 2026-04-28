import { randomUUID } from 'node:crypto';

const REQUEST_ID_HEADER = 'x-request-id';
const CORRELATION_ID_HEADER = 'x-correlation-id';

function sanitizeHeaderValue(value?: string | string[]): string | undefined {
  if (!value) {
    return undefined;
  }

  const rawValue = Array.isArray(value) ? value[0] : value;
  const sanitized = rawValue.trim();
  return sanitized.length > 0 ? sanitized : undefined;
}

export function generateRequestId(): string {
  return `req_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
}

export function extractRequestId(headers: Record<string, unknown>): string {
  const headerValue = sanitizeHeaderValue(
    headers[REQUEST_ID_HEADER] as string | string[] | undefined,
  );

  return headerValue ?? generateRequestId();
}

export function extractCorrelationId(
  headers: Record<string, unknown>,
  requestId: string,
): string {
  const headerValue = sanitizeHeaderValue(
    headers[CORRELATION_ID_HEADER] as string | string[] | undefined,
  );

  return headerValue ?? requestId;
}

export const requestHeaders = {
  correlationId: CORRELATION_ID_HEADER,
  requestId: REQUEST_ID_HEADER,
};
