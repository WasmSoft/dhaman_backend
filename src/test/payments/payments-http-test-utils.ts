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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PortalTokenGuard } from '../../common/guards/portal-token.guard';
import { ResponseEnvelopeInterceptor } from '../../common/interceptors/response-envelope.interceptor';
import { PaymentsController } from '../../modules/payments/payments.controller';
import { PaymentsService } from '../../modules/payments/payments.service';

export const TEST_AUTH_HEADER = 'Bearer payments-test-token';
export const TEST_AGREEMENT_ID = '123e4567-e89b-42d3-a456-426614174000';
export const TEST_PAYMENT_ID = '123e4567-e89b-42d3-a456-426614174001';
export const TEST_MILESTONE_ID = '123e4567-e89b-42d3-a456-426614174002';
export const TEST_USER_ID = '123e4567-e89b-42d3-a456-426614174003';
export const TEST_CORRELATION_ID = 'payments-correlation-id';
export const TEST_REQUEST_ID = 'payments-request-id';

@Injectable()
class TestJwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requestObject = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { id: string; role: UserRole };
    }>();
    const authorization = requestObject.headers.authorization;

    if (authorization !== TEST_AUTH_HEADER) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    requestObject.user = {
      id: TEST_USER_ID,
      role: UserRole.FREELANCER,
    };

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

    if (
      token !== 'payment-token' &&
      token !== 'release-token' &&
      token !== 'approval-token'
    ) {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    }

    return true;
  }
}

type PaymentsServiceHttpMock = Partial<
  Record<
    | 'fundMilestone'
    | 'getById'
    | 'getReceipt'
    | 'listByAgreementId'
    | 'portalFund'
    | 'portalReleaseConfirmation'
    | 'release',
    jest.Mock
  >
>;

export async function createPaymentsHttpTestApp(
  paymentsServiceMock: PaymentsServiceHttpMock,
): Promise<{
  app: INestApplication;
  authHeader: string;
  clsService: ClsService;
  request: ReturnType<typeof request>;
}> {
  const clsService = new ClsService();
  const moduleRef = await Test.createTestingModule({
    controllers: [PaymentsController],
    providers: [
      { provide: ClsService, useValue: clsService },
      { provide: ErrorTranslatorService, useClass: ErrorTranslatorService },
      { provide: PaymentsService, useValue: paymentsServiceMock },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useClass(TestJwtAuthGuard)
    .overrideGuard(PortalTokenGuard)
    .useClass(TestPortalTokenGuard)
    .compile();

  const app = moduleRef.createNestApplication();
  const errorTranslator = app.get<ErrorTranslatorService>(
    ErrorTranslatorService,
  );

  app.use((req: Request, _res: Response, next: NextFunction) => {
    const isPortalRequest = req.path.includes('/portal/');

    clsService.run(
      {
        actorType: isPortalRequest
          ? ActorType.CLIENT_PORTAL
          : ActorType.FREELANCER,
        agreementId: isPortalRequest ? TEST_AGREEMENT_ID : undefined,
        correlationId: TEST_CORRELATION_ID,
        locale: Locale.AR,
        portalTokenId: isPortalRequest ? 'portal-token-1' : undefined,
        portalTokenType: isPortalRequest
          ? req.path.includes('/release-confirmation')
            ? PortalTokenType.DELIVERY_REVIEW
            : PortalTokenType.PAYMENT_VIEW
          : undefined,
        requestId: TEST_REQUEST_ID,
        startedAt: new Date(),
        userId: isPortalRequest ? undefined : TEST_USER_ID,
        userRole: isPortalRequest ? undefined : UserRole.FREELANCER,
      },
      () => {
        next();
      },
    );
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor(clsService));
  app.useGlobalFilters(new HttpExceptionFilter(errorTranslator, clsService));

  await app.init();

  return {
    app,
    authHeader: TEST_AUTH_HEADER,
    clsService,
    request: request(app.getHttpServer() as Parameters<typeof request>[0]),
  };
}

export async function closeHttpTestApp(app: INestApplication): Promise<void> {
  await app.close();
}
