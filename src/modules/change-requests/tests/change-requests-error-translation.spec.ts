import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { Locale } from '../../../common/enums/locale.enum';
import { ERROR_CODE_HTTP_STATUS } from '../../../common/errors/error-code-map';
import { errorMessagesAr } from '../../../common/errors/error-messages.ar';
import { errorMessagesEn } from '../../../common/errors/error-messages.en';
import { ErrorTranslatorService } from '../../../common/errors/error-translator.service';

const CHANGE_REQUEST_ERROR_CODES: ErrorCode[] = [
  ErrorCode.CHANGE_REQUEST_NOT_FOUND,
  ErrorCode.CHANGE_REQUEST_AMOUNT_INVALID,
  ErrorCode.CHANGE_REQUEST_NOT_EDITABLE,
  ErrorCode.CHANGE_REQUEST_NOT_SENDABLE,
  ErrorCode.CHANGE_REQUEST_NOT_APPROVABLE,
  ErrorCode.CHANGE_REQUEST_NOT_DECLINABLE,
  ErrorCode.CHANGE_REQUEST_NOT_APPROVED,
  ErrorCode.AI_REVIEW_NOT_ELIGIBLE_FOR_CHANGE_REQUEST,
  ErrorCode.PAYMENT_NOT_FUNDABLE,
  ErrorCode.AGREEMENT_NOT_FOUND,
  ErrorCode.PORTAL_TOKEN_INVALID,
  ErrorCode.VALIDATION_ERROR,
  ErrorCode.UNAUTHORIZED,
  ErrorCode.FORBIDDEN,
];

describe('Change Requests error translation and status map', () => {
  const translator = new ErrorTranslatorService();

  it.each(CHANGE_REQUEST_ERROR_CODES)(
    'maps %s to a public HTTP status',
    (code) => {
      expect(ERROR_CODE_HTTP_STATUS[code]).toBeDefined();
      expect(typeof ERROR_CODE_HTTP_STATUS[code]).toBe('number');
    },
  );

  it('uses expected HTTP statuses for critical change request errors', () => {
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.CHANGE_REQUEST_NOT_FOUND]).toBe(
      HttpStatus.NOT_FOUND,
    );
    expect(
      ERROR_CODE_HTTP_STATUS[ErrorCode.CHANGE_REQUEST_AMOUNT_INVALID],
    ).toBe(HttpStatus.BAD_REQUEST);
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.CHANGE_REQUEST_NOT_EDITABLE]).toBe(
      HttpStatus.CONFLICT,
    );
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.CHANGE_REQUEST_NOT_SENDABLE]).toBe(
      HttpStatus.CONFLICT,
    );
    expect(
      ERROR_CODE_HTTP_STATUS[ErrorCode.CHANGE_REQUEST_NOT_APPROVABLE],
    ).toBe(HttpStatus.CONFLICT);
    expect(
      ERROR_CODE_HTTP_STATUS[ErrorCode.CHANGE_REQUEST_NOT_DECLINABLE],
    ).toBe(HttpStatus.CONFLICT);
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.CHANGE_REQUEST_NOT_APPROVED]).toBe(
      HttpStatus.CONFLICT,
    );
    expect(
      ERROR_CODE_HTTP_STATUS[
        ErrorCode.AI_REVIEW_NOT_ELIGIBLE_FOR_CHANGE_REQUEST
      ],
    ).toBe(HttpStatus.CONFLICT);
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.PAYMENT_NOT_FUNDABLE]).toBe(
      HttpStatus.CONFLICT,
    );
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.PORTAL_TOKEN_INVALID]).toBe(
      HttpStatus.UNAUTHORIZED,
    );
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.UNAUTHORIZED]).toBe(
      HttpStatus.UNAUTHORIZED,
    );
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.FORBIDDEN]).toBe(
      HttpStatus.FORBIDDEN,
    );
  });

  it.each(CHANGE_REQUEST_ERROR_CODES)(
    'has an English message for %s',
    (code) => {
      expect(errorMessagesEn[code]).toBeTruthy();
      expect(errorMessagesEn[code].trim().length).toBeGreaterThan(0);
    },
  );

  it.each(CHANGE_REQUEST_ERROR_CODES)(
    'has an Arabic message for %s',
    (code) => {
      expect(errorMessagesAr[code]).toBeTruthy();
      expect(String(errorMessagesAr[code]).trim().length).toBeGreaterThan(0);
    },
  );

  it.each(CHANGE_REQUEST_ERROR_CODES)(
    'translator returns English message for %s',
    (code) => {
      expect(translator.translate(code, Locale.EN)).toBe(errorMessagesEn[code]);
    },
  );

  it.each(CHANGE_REQUEST_ERROR_CODES)(
    'translator returns Arabic message for %s',
    (code) => {
      expect(translator.translate(code, Locale.AR)).toBe(errorMessagesAr[code]);
    },
  );
});
