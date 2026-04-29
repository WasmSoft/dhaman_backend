import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { ERROR_CODE_HTTP_STATUS } from '../../common/errors/error-code-map';
import { errorMessagesAr } from '../../common/errors/error-messages.ar';
import { errorMessagesEn } from '../../common/errors/error-messages.en';

describe('Milestones error messages', () => {
  const requiredCodes = [
    ErrorCode.MILESTONE_NOT_FOUND,
    ErrorCode.MILESTONE_INVALID_AMOUNT,
    ErrorCode.MILESTONE_INVALID_ORDER,
    ErrorCode.MILESTONE_PAYMENT_NOT_WAITING,
    ErrorCode.AGREEMENT_NOT_FOUND,
    ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED,
  ];

  it.each(requiredCodes)('defines localized messages for %s', (code) => {
    expect(errorMessagesEn[code]).toEqual(expect.any(String));
    expect(errorMessagesEn[code]).not.toHaveLength(0);
    expect(errorMessagesAr[code]).toEqual(expect.any(String));
    expect(errorMessagesAr[code]).not.toHaveLength(0);
  });

  it.each([
    [ErrorCode.MILESTONE_NOT_FOUND, HttpStatus.NOT_FOUND],
    [ErrorCode.MILESTONE_INVALID_AMOUNT, HttpStatus.BAD_REQUEST],
    [ErrorCode.MILESTONE_INVALID_ORDER, HttpStatus.CONFLICT],
    [ErrorCode.MILESTONE_PAYMENT_NOT_WAITING, HttpStatus.CONFLICT],
    [ErrorCode.AGREEMENT_NOT_FOUND, HttpStatus.NOT_FOUND],
    [ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED, HttpStatus.CONFLICT],
  ])('maps %s to the expected HTTP status', (code, status) => {
    expect(ERROR_CODE_HTTP_STATUS[code]).toBe(status);
  });
});
