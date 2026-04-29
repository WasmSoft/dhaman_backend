import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { ERROR_CODE_HTTP_STATUS } from '../../common/errors/error-code-map';
import { errorMessagesAr } from '../../common/errors/error-messages.ar';
import { errorMessagesEn } from '../../common/errors/error-messages.en';

describe('AI Review Phase 3 error contracts', () => {
  it('keeps required HTTP status mappings', () => {
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.DELIVERY_NOT_FOUND]).toBe(
      HttpStatus.NOT_FOUND,
    );
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.AI_REVIEW_ALREADY_COMPLETED]).toBe(
      HttpStatus.CONFLICT,
    );
    expect(ERROR_CODE_HTTP_STATUS[ErrorCode.AI_REVIEW_FAILED]).toBe(
      HttpStatus.BAD_GATEWAY,
    );
  });

  it('keeps required English and Arabic messages', () => {
    expect(errorMessagesEn[ErrorCode.DELIVERY_NOT_FOUND]).toBeTruthy();
    expect(errorMessagesEn[ErrorCode.AI_REVIEW_ALREADY_COMPLETED]).toBeTruthy();
    expect(errorMessagesEn[ErrorCode.AI_REVIEW_FAILED]).toBeTruthy();
    expect(errorMessagesAr[ErrorCode.DELIVERY_NOT_FOUND]).toBeTruthy();
    expect(errorMessagesAr[ErrorCode.AI_REVIEW_ALREADY_COMPLETED]).toBeTruthy();
    expect(errorMessagesAr[ErrorCode.AI_REVIEW_FAILED]).toBeTruthy();
  });
});
