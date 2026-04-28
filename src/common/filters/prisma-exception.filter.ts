import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { AppException } from '../errors/app-exception';
import { ErrorCode } from '../enums/error-code.enum';
import { HttpExceptionFilter } from './http-exception.filter';

type PrismaLikeError = {
  code?: string;
  meta?: Record<string, unknown>;
};

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  constructor(private readonly fallbackFilter: HttpExceptionFilter) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (!this.isPrismaLikeError(exception)) {
      this.fallbackFilter.catch(exception, host);
      return;
    }

    if (exception.code === 'P2002') {
      this.fallbackFilter.catch(
        new AppException({
          code: ErrorCode.CONFLICT,
          message: 'Unique constraint violation',
        }),
        host,
      );
      return;
    }

    if (exception.code === 'P2025') {
      this.fallbackFilter.catch(
        new AppException({
          code: ErrorCode.NOT_FOUND,
          message: 'Record not found',
        }),
        host,
      );
      return;
    }

    this.fallbackFilter.catch(
      new AppException({
        code: ErrorCode.INTERNAL_SERVER_ERROR,
      }),
      host,
    );
  }

  private isPrismaLikeError(exception: unknown): exception is PrismaLikeError {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      typeof exception.code === 'string' &&
      exception.code.startsWith('P')
    );
  }
}
