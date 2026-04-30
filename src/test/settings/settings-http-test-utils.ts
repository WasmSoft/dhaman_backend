import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { ClsService } from '../../common/cls/cls.service';
import { ActorType } from '../../common/enums/actor-type.enum';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { Locale } from '../../common/enums/locale.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { AppException } from '../../common/errors/app-exception';
import { ErrorTranslatorService } from '../../common/errors/error-translator.service';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ResponseEnvelopeInterceptor } from '../../common/interceptors/response-envelope.interceptor';
import { SettingsController } from '../../modules/settings/settings.controller';
import { SettingsService } from '../../modules/settings/settings.service';

export const TEST_AUTH_HEADER = 'Bearer settings-test-token';
export const TEST_USER_ID = 'settings-user-1';
export const TEST_REQUEST_ID = 'settings-request-id';
export const TEST_CORRELATION_ID = 'settings-correlation-id';

class TestJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
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

type SettingsServiceHttpMock = Partial<
  Record<
    'getSettings' | 'updateSettings' | 'getDefaultPolicies' | 'updateDefaultPolicies',
    jest.Mock
  >
>;

export async function createSettingsHttpTestApp(
  settingsServiceMock: SettingsServiceHttpMock,
): Promise<{
  app: INestApplication;
  authHeader: string;
  clsService: ClsService;
  request: ReturnType<typeof request>;
}> {
  const clsService = new ClsService();
  const moduleRef = await Test.createTestingModule({
    controllers: [SettingsController],
    providers: [
      { provide: ClsService, useValue: clsService },
      { provide: ErrorTranslatorService, useClass: ErrorTranslatorService },
      { provide: SettingsService, useValue: settingsServiceMock },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useClass(TestJwtAuthGuard)
    .compile();

  const app = moduleRef.createNestApplication();
  const errorTranslator = app.get<ErrorTranslatorService>(ErrorTranslatorService);

  app.use((req: Request, _res: Response, next: NextFunction) => {
    clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: TEST_CORRELATION_ID,
        locale: Locale.EN,
        requestId: TEST_REQUEST_ID,
        startedAt: new Date(),
        userId: TEST_USER_ID,
        userRole: UserRole.FREELANCER,
      },
      () => next(),
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

export async function closeSettingsHttpTestApp(
  app: INestApplication,
): Promise<void> {
  await app.close();
}
