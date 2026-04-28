import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ClsService } from '../cls/cls.service';
import { ErrorCode } from '../enums/error-code.enum';
import { Locale } from '../enums/locale.enum';
import { ApiError, ApiFieldError } from '../types/api-error.type';
import { AppException } from '../errors/app-exception';
import { ErrorTranslatorService } from '../errors/error-translator.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(
    private readonly errorTranslator: ErrorTranslatorService,
    private readonly clsService: ClsService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const locale =
      this.clsService.get('locale') ??
      (request.requestContext?.locale as Locale | undefined) ??
      Locale.AR;
    const requestId =
      this.clsService.get('requestId') ??
      request.requestContext?.requestId ??
      'unknown';
    const correlationId =
      this.clsService.get('correlationId') ??
      request.requestContext?.correlationId ??
      requestId;

    const resolved = this.resolveException(exception, locale);
    const errorBody: ApiError = {
      code: resolved.code,
      message: resolved.message,
      localizedMessage: resolved.localizedMessage,
      details: {
        correlationId,
        ...resolved.details,
      },
      fieldErrors: resolved.fieldErrors,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.originalUrl ?? request.url,
      method: request.method,
    };

    if (resolved.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `requestId=${requestId} method=${request.method} path=${request.originalUrl ?? request.url} code=${resolved.code}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(resolved.status).json({
      success: false,
      error: errorBody,
    });
  }

  private resolveException(
    exception: unknown,
    locale: Locale,
  ): {
    status: number;
    code: ErrorCode;
    message: string;
    localizedMessage: string;
    details: Record<string, unknown>;
    fieldErrors: ApiFieldError[];
  } {
    if (exception instanceof AppException) {
      const message =
        exception.message ||
        this.errorTranslator.getDefaultMessage(exception.code);
      const localizedMessage =
        exception.localizedMessage ??
        this.errorTranslator.translate(exception.code, locale);

      return {
        status: exception.getStatus(),
        code: exception.code,
        message,
        localizedMessage,
        details: exception.details ?? {},
        fieldErrors: exception.fieldErrors ?? [],
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const baseCode =
        status === HttpStatus.BAD_REQUEST
          ? ErrorCode.VALIDATION_ERROR
          : status === HttpStatus.UNAUTHORIZED
            ? ErrorCode.UNAUTHORIZED
            : status === HttpStatus.FORBIDDEN
              ? ErrorCode.FORBIDDEN
              : status === HttpStatus.NOT_FOUND
                ? ErrorCode.NOT_FOUND
                : status === HttpStatus.CONFLICT
                  ? ErrorCode.CONFLICT
                  : ErrorCode.BAD_REQUEST;

      const fieldErrors = this.extractFieldErrors(response);
      const message =
        typeof response === 'object' && response && 'message' in response
          ? Array.isArray(response.message)
            ? this.errorTranslator.getDefaultMessage(baseCode)
            : String(response.message)
          : this.errorTranslator.getDefaultMessage(baseCode);

      return {
        status,
        code: baseCode,
        message,
        localizedMessage: this.errorTranslator.translate(baseCode, locale),
        details: {},
        fieldErrors,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: this.errorTranslator.getDefaultMessage(
        ErrorCode.INTERNAL_SERVER_ERROR,
      ),
      localizedMessage: this.errorTranslator.translate(
        ErrorCode.INTERNAL_SERVER_ERROR,
        locale,
      ),
      details: {},
      fieldErrors: [],
    };
  }

  private extractFieldErrors(response: string | object): ApiFieldError[] {
    if (
      typeof response === 'object' &&
      response &&
      'message' in response &&
      Array.isArray(response.message)
    ) {
      return response.message.map((message, index) => ({
        field: `field_${index + 1}`,
        message: String(message),
      }));
    }

    return [];
  }
}
