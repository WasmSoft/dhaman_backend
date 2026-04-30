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
import { AiPlanController } from '../../modules/ai-plan/ai-plan.controller';
import { AiPlanService } from '../../modules/ai-plan/ai-plan.service';
import { GeneratedPlanResponseDto } from '../../modules/ai-plan/dto/ai-plan.dto';

export const TEST_USER_ID = 'test-user-id';
export const TEST_REQUEST_ID = 'test-req-001';
export const TEST_CORRELATION_ID = 'test-correlation-001';

const TEST_AUTH_HEADER = 'Bearer test-token';

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

export function makeMockAiPlanService() {
  return {
    generatePlan: jest.fn(),
    generatePlanForAgreement: jest.fn(),
  } as jest.Mocked<
    Pick<AiPlanService, 'generatePlan' | 'generatePlanForAgreement'>
  >;
}

export const VALID_GENERATED_PLAN_RESPONSE: GeneratedPlanResponseDto = {
  id: 'draft-001',
  milestones: [
    {
      title: 'مرحلة التخطيط والتحليل',
      amount: 4800,
      dueInDays: 7,
      acceptanceCriteria: [
        'تسليم وثيقة المتطلبات الكاملة',
        'موافقة العميل على نطاق العمل',
      ],
      revisionLimit: 2,
    },
  ],
  policies: {
    delayPolicy: 'في حال تأخر أي من الطرفين...',
    cancellationPolicy: 'يحق لأي من الطرفين إلغاء الاتفاقية...',
    extraRequestPolicy: 'أي طلب إضافي خارج نطاق العمل...',
    reviewPolicy: 'يحق للعميل طلب تعديلات خلال 5 أيام...',
  },
  ambiguityWarnings: ['لم يتم تحديد مدة زمنية واضحة للمشروع بالكامل'],
  clarityScore: 75,
};

export async function createAiPlanHttpTestApp(aiPlanServiceMock: {
  generatePlan?: jest.Mock;
  generatePlanForAgreement?: jest.Mock;
}): Promise<{
  app: INestApplication;
  authHeader: string;
  clsService: ClsService;
  request: ReturnType<typeof request>;
}> {
  const clsService = new ClsService();
  const moduleRef = await Test.createTestingModule({
    controllers: [AiPlanController],
    providers: [
      { provide: ClsService, useValue: clsService },
      { provide: ErrorTranslatorService, useClass: ErrorTranslatorService },
      { provide: AiPlanService, useValue: aiPlanServiceMock },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useClass(TestJwtAuthGuard)
    .compile();

  const app = moduleRef.createNestApplication();
  const errorTranslator = app.get<ErrorTranslatorService>(
    ErrorTranslatorService,
  );

  app.use((req: Request, _res: Response, next: NextFunction) => {
    clsService.run(
      {
        actorType: ActorType.FREELANCER,
        correlationId: TEST_CORRELATION_ID,
        locale: Locale.AR,
        requestId: TEST_REQUEST_ID,
        startedAt: new Date(),
        userId: TEST_USER_ID,
        userRole: UserRole.FREELANCER,
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

export async function closeAiPlanHttpTestApp(
  app: INestApplication,
): Promise<void> {
  await app.close();
}
