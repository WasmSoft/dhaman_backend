import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { ERROR_CODE_HTTP_STATUS } from '../../common/errors/error-code-map';
import { errorMessagesAr } from '../../common/errors/error-messages.ar';
import { errorMessagesEn } from '../../common/errors/error-messages.en';

const authErrorCases: Array<{ code: ErrorCode; status: HttpStatus }> = [
  { code: ErrorCode.AUTH_EMAIL_ALREADY_EXISTS, status: HttpStatus.CONFLICT },
  { code: ErrorCode.AUTH_INVALID_CREDENTIALS, status: HttpStatus.UNAUTHORIZED },
  { code: ErrorCode.AUTH_USER_NOT_FOUND, status: HttpStatus.NOT_FOUND },
  { code: ErrorCode.AUTH_TOKEN_INVALID, status: HttpStatus.UNAUTHORIZED },
  { code: ErrorCode.AUTH_TOKEN_EXPIRED, status: HttpStatus.UNAUTHORIZED },
  { code: ErrorCode.UNAUTHORIZED, status: HttpStatus.UNAUTHORIZED },
];

describe('Auth error messages', () => {
  it.each(authErrorCases)(
    'defines localized messages for $code',
    ({ code }) => {
      expect(errorMessagesEn[code]).toEqual(expect.any(String));
      expect(errorMessagesEn[code]).not.toHaveLength(0);
      expect(errorMessagesAr[code]).toEqual(expect.any(String));
      expect(errorMessagesAr[code]).not.toHaveLength(0);
    },
  );

  it.each(authErrorCases)(
    'maps $code to the expected HTTP status',
    ({ code, status }) => {
      expect(ERROR_CODE_HTTP_STATUS[code]).toBe(status);
    },
  );
});
