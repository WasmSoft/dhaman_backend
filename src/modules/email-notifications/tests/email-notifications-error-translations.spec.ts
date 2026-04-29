import { ErrorCode } from '../../../common/enums/error-code.enum';
import { errorMessagesEn } from '../../../common/errors/error-messages.en';
import { errorMessagesAr } from '../../../common/errors/error-messages.ar';
import { ERROR_CODE_HTTP_STATUS } from '../../../common/errors/error-code-map';
import { HttpStatus } from '@nestjs/common';

const EMAIL_ERROR_CODES = [
  ErrorCode.EMAIL_TEMPLATE_NOT_FOUND,
  ErrorCode.EMAIL_RENDER_FAILED,
  ErrorCode.EMAIL_RECIPIENT_REQUIRED,
  ErrorCode.CLIENT_EMAIL_MISSING,
  ErrorCode.EMAIL_TYPE_NOT_SUPPORTED,
  ErrorCode.EMAIL_CONTEXT_INCOMPLETE,
  ErrorCode.EMAIL_SEND_FAILED,
  ErrorCode.EMAIL_NOTIFICATIONS_DISABLED,
  ErrorCode.AGREEMENT_NOT_FOUND,
  ErrorCode.AGREEMENT_NOT_INVITABLE,
  ErrorCode.VALIDATION_ERROR,
  ErrorCode.UNAUTHORIZED,
  ErrorCode.FORBIDDEN,
];

describe('Email notification error translations', () => {
  it.each(EMAIL_ERROR_CODES)('%s resolves to an English message', (code) => {
    expect(errorMessagesEn[code]).toBeTruthy();
    expect(typeof errorMessagesEn[code]).toBe('string');
    expect(errorMessagesEn[code].length).toBeGreaterThan(0);
  });

  it.each(EMAIL_ERROR_CODES)('%s resolves to an Arabic message', (code) => {
    const messages = errorMessagesAr as Record<string, string>;
    expect(messages[code]).toBeTruthy();
    expect(typeof messages[code]).toBe('string');
    expect(messages[code].length).toBeGreaterThan(0);
  });

  it.each(EMAIL_ERROR_CODES)('%s has a defined HTTP status', (code) => {
    expect(ERROR_CODE_HTTP_STATUS[code]).toBeDefined();
    expect(Object.values(HttpStatus)).toContain(ERROR_CODE_HTTP_STATUS[code]);
  });

  it.each(EMAIL_ERROR_CODES)('%s Arabic message differs from English', (code) => {
    const messages = errorMessagesAr as Record<string, string>;
    expect(messages[code]).not.toBe(errorMessagesEn[code]);
  });

  it('Arabic messages contain Arabic script for all email codes', () => {
    const arabicRange = /[\u0600-\u06FF]/;
    for (const code of EMAIL_ERROR_CODES) {
      const messages = errorMessagesAr as Record<string, string>;
      expect(messages[code]).toMatch(arabicRange);
    }
  });

  it('EMAIL_TEMPLATE_NOT_FOUND maps to HTTP 404', () => {
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.EMAIL_TEMPLATE_NOT_FOUND]).toBe(HttpStatus.NOT_FOUND);
  });

  it('EMAIL_RECIPIENT_REQUIRED maps to HTTP 400', () => {
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.EMAIL_RECIPIENT_REQUIRED]).toBe(HttpStatus.BAD_REQUEST);
  });

  it('EMAIL_NOTIFICATIONS_DISABLED maps to HTTP 409', () => {
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.EMAIL_NOTIFICATIONS_DISABLED]).toBe(HttpStatus.CONFLICT);
  });

  it('UNAUTHORIZED maps to HTTP 401', () => {
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.UNAUTHORIZED]).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('FORBIDDEN maps to HTTP 403', () => {
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.FORBIDDEN]).toBe(HttpStatus.FORBIDDEN);
  });
});

describe('Email notification error sanitization', () => {
  it('EMAIL_SEND_FAILED is a stable user-facing code, not a provider detail', () => {
    const code = ErrorCode.EMAIL_SEND_FAILED;
    expect(code).toBe('EMAIL_SEND_FAILED');
    expect(errorMessagesEn[code]).not.toContain('API_KEY');
    expect(errorMessagesEn[code]).not.toContain('api_key');
    expect(errorMessagesEn[code]).not.toContain('RESEND');
    expect(errorMessagesEn[code]).not.toContain('stack');
  });

  it('error messages do not expose provider or server internals', () => {
    for (const code of EMAIL_ERROR_CODES) {
      const en = errorMessagesEn[code];
      const ar = (errorMessagesAr as Record<string, string>)[code];
      expect(en).not.toContain('Resend');
      expect(en).not.toContain('stack trace');
      expect(ar).not.toContain('Resend');
      expect(ar).not.toContain('stack trace');
    }
  });
});
