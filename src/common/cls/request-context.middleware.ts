import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { ActorType } from '../enums/actor-type.enum';
import { Locale } from '../enums/locale.enum';
import { ClsService } from './cls.service';
import {
  extractCorrelationId,
  extractRequestId,
  requestHeaders,
} from './request-id.util';
import { RequestContext } from './request-context.type';

type RequestWithContext = Request & {
  requestContext?: RequestContext;
};

function resolveLocale(request: Request): Locale {
  const requestedLocale =
    request.header('x-locale') ?? request.header('accept-language') ?? '';
  const normalized = requestedLocale.toLowerCase();
  const defaultLocale =
    process.env.DEFAULT_LOCALE?.toLowerCase() === Locale.EN
      ? Locale.EN
      : Locale.AR;

  if (normalized.startsWith(Locale.EN)) {
    return Locale.EN;
  }

  return defaultLocale;
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly clsService: ClsService) {}

  use(
    request: RequestWithContext,
    response: Response,
    next: NextFunction,
  ): void {
    const requestId = extractRequestId(request.headers);
    const correlationId = extractCorrelationId(request.headers, requestId);

    const context: RequestContext = {
      requestId,
      correlationId,
      actorType: ActorType.UNKNOWN,
      locale: resolveLocale(request),
      startedAt: new Date(),
    };

    request.requestContext = context;
    response.setHeader(requestHeaders.requestId, requestId);
    response.setHeader(requestHeaders.correlationId, correlationId);

    this.clsService.run(context, () => next());
  }
}
