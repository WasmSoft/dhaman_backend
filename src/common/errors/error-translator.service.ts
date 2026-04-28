import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../enums/error-code.enum';
import { Locale } from '../enums/locale.enum';
import { errorMessagesAr } from './error-messages.ar';
import { errorMessagesEn } from './error-messages.en';

@Injectable()
export class ErrorTranslatorService {
  translate(code: ErrorCode, locale: Locale): string {
    if (locale === Locale.AR && errorMessagesAr[code]) {
      return errorMessagesAr[code];
    }

    return (
      errorMessagesEn[code] ?? errorMessagesEn[ErrorCode.INTERNAL_SERVER_ERROR]
    );
  }

  getDefaultMessage(code: ErrorCode): string {
    return (
      errorMessagesEn[code] ?? errorMessagesEn[ErrorCode.INTERNAL_SERVER_ERROR]
    );
  }
}
