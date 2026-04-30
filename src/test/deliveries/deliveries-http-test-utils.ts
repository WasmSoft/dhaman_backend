import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  Injectable,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { ClsService } from '../../common/cls/cls.service';
import { ActorType } from '../../common/enums/actor-type.enum';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { Locale } from '../../common/enums/locale.enum';
import { PortalTokenType } from '../../common/enums/portal-token-type.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { AppException } from '../../common/errors/app-exception';
import { ErrorTranslatorService } from '../../common/errors/error-translator.service';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { ResponseEnvelopeInterceptor } from '../../common/interceptors/response-envelope.interceptor';
import { DeliveriesController } from '../../modules/deliveries/deliveries.controller';
import { DeliveriesService } from '../../modules/deliveries/deliveries.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PortalTokenGuard } from '../../common/guards/portal-token.guard';

export const TEST_AUTH_HEADER = 'Bearer deliveries-test-token';
export const TEST_USER_ID = 'freelancer-1';
export const TEST_AGREEMENT_ID = 'f7c5b8d4-2c1a-4d2c-9d5e-2a4b6c8d0e2f';
export const TEST_MILESTONE_ID = 'a1b2c3d4-e5f6-4890-9234-567890abcdef';
export const TEST_DELIVERY_ID = '0fed4321-09bc-4654-8210-fedcba987654';
export const TEST_PORTAL_TOKEN = 'valid-review-token';
export const TEST_CORRELATION_ID = 'deliveries-correlation-id';
export const TEST_REQUEST_ID = 'deliveries-request-id';

@Injectable()
class TestJwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requestObject = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { id: string; role: UserRole };
    }>();
    const authorization = requestObject.headers.authorization;

    if (authorization !== TEST_AUTH_HEADER) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }
    requestObject.user = { id: TEST_USER_ID, role: UserRole.FREELANCER };
    return true;
  }
}

@Injectable()
class TestPortalTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requestObject = context.switchToHttp().getRequest<{
      params?: { token?: string };
    }>();
    const token = requestObject.params?.token;

    if (!token || token === 'invalid-token') {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    }
    if (token === 'expired-token') {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_EXPIRED });
    }
    if (token !== TEST_PORTAL_TOKEN) {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    }
    return true;
  }
}

export async function createDeliveriesHttpTestApp(
  serviceMock: Partial<Record<keyof DeliveriesService, jest.Mock>>,
) {
  const clsService = new ClsService();
  const moduleRef = await Test.createTestingModule({
    controllers: [DeliveriesController],
    providers: [
      { provide: ClsService, useValue: clsService },
      { provide: ErrorTranslatorService, useClass: ErrorTranslatorService },
      { provide: DeliveriesService, useValue: serviceMock },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useClass(TestJwtAuthGuard)
    .overrideGuard(PortalTokenGuard)
    .useClass(TestPortalTokenGuard)
    .compile();

  const app = moduleRef.createNestApplication();
  const errorTranslator = app.get<ErrorTranslatorService>(ErrorTranslatorService);

  app.use((req: Request, _res: Response, next: NextFunction) => {
    const isPortalRequest = req.path.includes('/portal/');
    clsService.run(
      {
        actorType: isPortalRequest ? ActorType.CLIENT_PORTAL : ActorType.FREELANCER,
        agreementId: isPortalRequest ? TEST_AGREEMENT_ID : undefined,
        correlationId: TEST_CORRELATION_ID,
        locale: Locale.EN,
        portalTokenId: isPortalRequest ? 'portal-token-1' : undefined,
        portalTokenType: isPortalRequest ? PortalTokenType.DELIVERY_REVIEW : undefined,
        requestId: TEST_REQUEST_ID,
        startedAt: new Date(),
        userId: isPortalRequest ? undefined : TEST_USER_ID,
        userRole: isPortalRequest ? undefined : UserRole.FREELANCER,
      },
      () => next(),
    );
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor(clsService));
  app.useGlobalFilters(new HttpExceptionFilter(errorTranslator, clsService));
  app.setGlobalPrefix('api/v1');

  await app.init();

  return {
    app,
    authHeader: TEST_AUTH_HEADER,
    clsService,
    request: request(app.getHttpServer() as Parameters<typeof request>[0]),
  };
}
