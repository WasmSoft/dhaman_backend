import { HttpException } from '@nestjs/common';
import { ErrorCode } from '../enums/error-code.enum';
import { ApiFieldError } from '../types/api-error.type';
import { ERROR_CODE_HTTP_STATUS } from './error-code-map';

type AppExceptionOptions = {
  code: ErrorCode;
  httpStatus?: number;
  message?: string;
  localizedMessage?: string;
  details?: Record<string, unknown>;
  fieldErrors?: ApiFieldError[];
};

export class AppException extends HttpException {
  readonly code: ErrorCode;
  readonly localizedMessage?: string;
  readonly details?: Record<string, unknown>;
  readonly fieldErrors?: ApiFieldError[];

  constructor(options: AppExceptionOptions) {
    super(
      {
        code: options.code,
        details: options.details ?? {},
        fieldErrors: options.fieldErrors ?? [],
        localizedMessage: options.localizedMessage,
        message: options.message,
      },
      options.httpStatus ?? ERROR_CODE_HTTP_STATUS[options.code],
    );

    this.code = options.code;
    this.localizedMessage = options.localizedMessage;
    this.details = options.details ?? {};
    this.fieldErrors = options.fieldErrors ?? [];
  }
}
