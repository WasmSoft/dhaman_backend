import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ClsService } from '../cls/cls.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  constructor(private readonly clsService: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (process.env.ENABLE_REQUEST_LOGGING === 'false') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      finalize(() => {
        const requestContext = this.clsService.getContext();
        const durationMs = requestContext?.startedAt
          ? Date.now() - requestContext.startedAt.getTime()
          : 0;

        this.logger.log(
          [
            `requestId=${requestContext?.requestId ?? 'unknown'}`,
            `method=${request.method}`,
            `path=${request.originalUrl ?? request.url}`,
            `userId=${requestContext?.userId ?? 'anonymous'}`,
            `actorType=${requestContext?.actorType ?? 'UNKNOWN'}`,
            `statusCode=${response.statusCode}`,
            `durationMs=${durationMs}`,
          ].join(' '),
        );
      }),
    );
  }
}
