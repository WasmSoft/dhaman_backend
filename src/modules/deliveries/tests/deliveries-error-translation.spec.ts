import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { Locale } from '../../../common/enums/locale.enum';
import { ERROR_CODE_HTTP_STATUS } from '../../../common/errors/error-code-map';
import { errorMessagesAr } from '../../../common/errors/error-messages.ar';
import { errorMessagesEn } from '../../../common/errors/error-messages.en';
import { ErrorTranslatorService } from '../../../common/errors/error-translator.service';

const DELIVERY_ERROR_CODES: ErrorCode[] = [
  ErrorCode.DELIVERY_NOT_FOUND,
  ErrorCode.DELIVERY_ALREADY_EXISTS,
  ErrorCode.DELIVERY_NOT_EDITABLE,
  ErrorCode.DELIVERY_NOT_SUBMITTABLE,
  ErrorCode.DELIVERY_EVIDENCE_REQUIRED,
  ErrorCode.DELIVERY_NOT_REVIEWABLE,
  ErrorCode.AGREEMENT_NOT_ACTIVE,
  ErrorCode.MILESTONE_NOT_FOUND,
  ErrorCode.PAYMENT_NOT_RESERVED,
  ErrorCode.PORTAL_TOKEN_INVALID,
  ErrorCode.UNAUTHORIZED,
  ErrorCode.FORBIDDEN,
  ErrorCode.VALIDATION_ERROR,
];

describe('Deliveries error translation and status map', () => {
  const translator = new ErrorTranslatorService();

  it.each(DELIVERY_ERROR_CODES)(
    'maps %s to a public HTTP status',
    (code) => {
      expect(ERROR_CODE_HTTP_STATUS[code]).toBeDefined();
      expect(typeof ERROR_CODE_HTTP_STATUS[code]).toBe('number');
    },
  );

  it('uses expected HTTP statuses for critical delivery errors', () => {
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.DELIVERY_NOT_FOUND]).toBe(
      HttpStatus.NOT_FOUND,
    );
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.DELIVERY_ALREADY_EXISTS]).toBe(
      HttpStatus.CONFLICT,
    );
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.DELIVERY_NOT_EDITABLE]).toBe(
      HttpStatus.CONFLICT,
    );
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.DELIVERY_NOT_SUBMITTABLE]).toBe(
      HttpStatus.CONFLICT,
    );
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.DELIVERY_EVIDENCE_REQUIRED]).toBe(
      HttpStatus.BAD_REQUEST,
    );
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.DELIVERY_NOT_REVIEWABLE]).toBe(
      HttpStatus.CONFLICT,
    );
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.PORTAL_TOKEN_INVALID]).toBe(
      HttpStatus.UNAUTHORIZED,
    );
  });

  it.each(DELIVERY_ERROR_CODES)(
    'has an English message for %s',
    (code) => {
      expect(errorMessagesEn[code]).toBeTruthy();
      expect(errorMessagesEn[code].trim().length).toBeGreaterThan(0);
    },
  );

  it.each(DELIVERY_ERROR_CODES)(
    'has an Arabic message for %s',
    (code) => {
      expect(errorMessagesAr[code]).toBeTruthy();
      expect(String(errorMessagesAr[code]).trim().length).toBeGreaterThan(0);
    },
  );

  it.each(DELIVERY_ERROR_CODES)(
    'translator returns English message for %s',
    (code) => {
      expect(translator.translate(code, Locale.EN)).toBe(errorMessagesEn[code]);
    },
  );

  it.each(DELIVERY_ERROR_CODES)(
    'translator returns Arabic message for %s',
    (code) => {
      expect(translator.translate(code, Locale.AR)).toBe(errorMessagesAr[code]);
    },
  );
});
