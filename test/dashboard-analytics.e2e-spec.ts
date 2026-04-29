/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';
import { ClsModule } from '../src/common/cls/cls.module';
import { RequestContextMiddleware } from '../src/common/cls/request-context.middleware';
import { ErrorCode } from '../src/common/enums/error-code.enum';
import { Locale } from '../src/common/enums/locale.enum';
import { ErrorTranslatorModule } from '../src/common/errors/error-translator.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { ResponseEnvelopeInterceptor } from '../src/common/interceptors/response-envelope.interceptor';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { DashboardAnalyticsController } from '../src/modules/dashboard-analytics/dashboard-analytics.controller';
import { DashboardAnalyticsService } from '../src/modules/dashboard-analytics/dashboard-analytics.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { buildTwoFreelancersOverlapScenario } from '../src/modules/dashboard-analytics/tests/dashboard-service-test-helpers';
import { readErrorTranslation } from '../src/modules/dashboard-analytics/tests/dashboard-dto-test-helpers';

const TEST_JWT_SECRET = 'phase-5-dashboard-e2e-secret';
const TEST_JWT_EXPIRES_IN = '1h';

function expectErrorCode(response: request.Response, code: ErrorCode): void {
  expect(response.body).toEqual(
    expect.objectContaining({
      error: expect.objectContaining({
        code,
        requestId: expect.any(String),
      }),
      success: false,
    }),
  );
}

describe('Dashboard Analytics endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let prismaMock: PrismaService;

  const freelancerA = {
    id: 'freelancer-a-1',
    email: 'a@example.com',
    name: 'Freelancer A',
  };
  const freelancerB = {
    id: 'freelancer-b-1',
    email: 'b@example.com',
    name: 'Freelancer B',
  };
  const agreementOwnedByB = '8d1a58a2-e89f-4a21-9b6e-becce6a1e982';

  function signToken(userId: string, role = 'FREELANCER'): string {
    return jwtService.sign({ role, sub: userId });
  }

  beforeAll(async () => {
    const fixture: ReturnType<typeof buildTwoFreelancersOverlapScenario> =
      buildTwoFreelancersOverlapScenario();

    prismaMock = {
      agreement: {
        groupBy: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          const found = fixture.agreements.find(
            (a) => a.id === where.id && a.freelancerId === where.freelancerId,
          );
          return Promise.resolve(found ?? null);
        }),
      },
      payment: {
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      client: {
        count: jest.fn().mockResolvedValue(0),
      },
      delivery: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      aIReview: {
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      changeRequest: {
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      timelineEvent: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          let events = fixture.timelineEvents.filter(
            (e) =>
              fixture.agreements.find((a) => a.id === e.agreementId)
                ?.freelancerId === where.agreement.freelancerId,
          );
          if (where.agreementId) {
            events = events.filter((e) => e.agreementId === where.agreementId);
          }
          if (where.type) {
            events = events.filter((e) => e.type === where.type);
          }
          return Promise.resolve(
            events.map((e) => ({
              ...e,
              agreement: { title: 'Test Agreement' },
            })),
          );
        }),
      },
    } as unknown as PrismaService;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ClsModule,
        ErrorTranslatorModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: TEST_JWT_SECRET,
          signOptions: { expiresIn: TEST_JWT_EXPIRES_IN },
        }),
      ],
      controllers: [DashboardAnalyticsController],
      providers: [
        DashboardAnalyticsService,
        JwtAuthGuard,
        JwtStrategy,
        RequestContextMiddleware,
        HttpExceptionFilter,
        PrismaExceptionFilter,
        ResponseEnvelopeInterceptor,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'jwt.secret') return TEST_JWT_SECRET;
              if (key === 'jwt.expiresIn') return TEST_JWT_EXPIRES_IN;
              return undefined;
            },
          },
        },
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    const requestContextMiddleware = moduleFixture.get(
      RequestContextMiddleware,
    );
    app.use((req: Request, res: Response, next: NextFunction) => {
      requestContextMiddleware.use(req, res, next);
    });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
        validationError: {
          target: false,
          value: false,
        },
      }),
    );
    app.useGlobalInterceptors(moduleFixture.get(ResponseEnvelopeInterceptor));
    app.useGlobalFilters(
      moduleFixture.get(PrismaExceptionFilter),
      moduleFixture.get(HttpExceptionFilter),
    );
    jwtService = moduleFixture.get(JwtService);

    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/dashboard/overview', () => {
    it('returns UNAUTHORIZED without an Authorization header (FR-007)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard/overview')
        .expect(401);

      expectErrorCode(response, ErrorCode.UNAUTHORIZED);
    });

    it('returns a successful overview for an authenticated freelancer', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard/overview')
        .set('Authorization', `Bearer ${signToken(freelancerA.id)}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        }),
      );
    });
  });

  describe('GET /api/v1/dashboard/actions-required', () => {
    it('returns UNAUTHORIZED without an Authorization header (FR-007)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard/actions-required')
        .expect(401);

      expectErrorCode(response, ErrorCode.UNAUTHORIZED);
    });

    it('returns UNAUTHORIZED without an Authorization header for recent-activity (FR-007)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard/recent-activity')
        .expect(401);

      expectErrorCode(response, ErrorCode.UNAUTHORIZED);
    });
  });

  describe('Cross-tenant ownership', () => {
    it('authenticates as freelancer A and ensures no record references freelancer B (FR-008, SC-007)', async () => {
      const tokenA = signToken(freelancerA.id);

      const overview = await request(app.getHttpServer())
        .get('/api/v1/dashboard/overview')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const actions = await request(app.getHttpServer())
        .get('/api/v1/dashboard/actions-required')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const recent = await request(app.getHttpServer())
        .get('/api/v1/dashboard/recent-activity')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const allResponses = [overview.body, actions.body, recent.body];

      for (const body of allResponses) {
        const json = JSON.stringify(body);
        expect(json).not.toContain(freelancerB.id);
        expect(json).not.toContain('8d1a58a2-e89f-4a21-9b6e-becce6a1e982');
        expect(json).not.toContain('8d1a58a2-e89f-4a21-9b6e-becce6a1e983');
      }
    });

    it('authenticates as freelancer A and calls recent-activity with B agreementId; asserts AGREEMENT_NOT_FOUND 404 identical to non-existent UUID (FR-009)', async () => {
      const tokenA = signToken(freelancerA.id);

      const responseB = await request(app.getHttpServer())
        .get('/api/v1/dashboard/recent-activity')
        .query({ agreementId: agreementOwnedByB })
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);

      const responseNonExistent = await request(app.getHttpServer())
        .get('/api/v1/dashboard/recent-activity')
        .query({ agreementId: '00000000-0000-0000-0000-000000000000' })
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);

      expectErrorCode(responseB, ErrorCode.AGREEMENT_NOT_FOUND);
      expectErrorCode(responseNonExistent, ErrorCode.AGREEMENT_NOT_FOUND);

      expect(responseB.body.error.code).toBe(
        responseNonExistent.body.error.code,
      );
      expect(responseB.body.error.localizedMessage).toBeDefined();
    });

    it('regression — ownership scoping must not be removed (SC-007)', async () => {
      const tokenA = signToken(freelancerA.id);

      const recent = await request(app.getHttpServer())
        .get('/api/v1/dashboard/recent-activity')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const itemIds =
        recent.body.data?.items?.map((item: { id: string }) => item.id) ?? [];

      const fixture = buildTwoFreelancersOverlapScenario();
      const bAgreementIds = fixture.agreements
        .filter((a) => a.freelancerId === freelancerB.id)
        .map((a) => a.id);
      const bEventIds = fixture.timelineEvents
        .filter((e) => bAgreementIds.includes(e.agreementId))
        .map((e) => e.id);

      for (const bId of bEventIds) {
        expect(itemIds).not.toContain(bId);
      }
    });
  });

  describe('Localized error messages', () => {
    it('exercises Accept-Language: ar against an invalid range request and asserts Arabic validation error message (FR-012)', async () => {
      const tokenA = signToken(freelancerA.id);

      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard/overview')
        .query({ range: 'foo' })
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Accept-Language', 'ar')
        .expect(400);

      expectErrorCode(response, ErrorCode.VALIDATION_ERROR);

      const expectedArMessage = readErrorTranslation(
        ErrorCode.VALIDATION_ERROR,
        Locale.AR,
      );
      expect(response.body.error.localizedMessage).toBe(expectedArMessage);
    });

    it('exercises Accept-Language: ar against an unowned agreementId and asserts Arabic AGREEMENT_NOT_FOUND message (FR-012)', async () => {
      const tokenA = signToken(freelancerA.id);

      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard/recent-activity')
        .query({ agreementId: agreementOwnedByB })
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Accept-Language', 'ar')
        .expect(404);

      expectErrorCode(response, ErrorCode.AGREEMENT_NOT_FOUND);

      const expectedArMessage = readErrorTranslation(
        ErrorCode.AGREEMENT_NOT_FOUND,
        Locale.AR,
      );
      expect(response.body.error.localizedMessage).toBe(expectedArMessage);
    });
  });
});
