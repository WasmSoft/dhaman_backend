import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';
import { ClsModule } from '../../common/cls/cls.module';
import { RequestContextMiddleware } from '../../common/cls/request-context.middleware';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/errors/app-exception';
import { ErrorTranslatorModule } from '../../common/errors/error-translator.module';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PortalTokenGuard } from '../../common/guards/portal-token.guard';
import { ResponseEnvelopeInterceptor } from '../../common/interceptors/response-envelope.interceptor';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { AiReviewController } from './ai-review.controller';
import { AiReviewService } from './ai-review.service';
import {
  AIRecommendation,
  AIReviewStatus,
  TimelineActorRole,
} from '@prisma/client';
import { AiReviewResponseDto } from './dto/ai-review-response.dto';
import { AiReviewListResponseDto } from './dto/ai-review-list-response.dto';

const TEST_JWT_SECRET = 'ai-review-test-secret-key';
const TEST_JWT_EXPIRES_IN = '1h';

function createReviewResponse(overrides: Partial<AiReviewResponseDto> = {}): AiReviewResponseDto {
  return {
    id: '31ddf8a4-cb55-4d38-b91b-9cdd15f0b7f1',
    agreementId: 'f7c5b8d4-2c1a-4d2c-9d5e-2a4b6c8d0e2f',
    milestoneId: 'a1b2c3d4-e5f6-4890-9234-567890abcdef',
    deliveryId: '0fed4321-09bc-4654-8210-fedcba987654',
    status: AIReviewStatus.COMPLETED,
    matchScore: 72,
    recommendation: AIRecommendation.PARTIAL,
    reasoning: 'Test reasoning',
    completedCriteria: ['criteria-1'],
    missingCriteria: ['missing-1'],
    outOfScopeItems: ['out-of-scope-1'],
    objection: 'Test objection',
    requestedByRole: TimelineActorRole.CLIENT,
    createdAt: new Date('2026-04-29T12:00:00.000Z'),
    updatedAt: new Date('2026-04-29T12:05:00.000Z'),
    ...overrides,
  };
}

function expectErrorCode(response: request.Response, code: ErrorCode, status: number): void {
  expect(response.status).toBe(status);
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

describe('AiReviewController (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let aiReviewServiceMock: Record<string, jest.Mock>;

  beforeAll(async () => {
    aiReviewServiceMock = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      openReview: jest.fn(),
      reviewPaymentRelease: jest.fn(),
      acceptRecommendation: jest.fn(),
    };

    const prismaMock = {};

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
      controllers: [AiReviewController],
      providers: [
        JwtAuthGuard,
        PortalTokenGuard,
        JwtStrategy,
        RequestContextMiddleware,
        HttpExceptionFilter,
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
        {
          provide: AiReviewService,
          useValue: aiReviewServiceMock,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    const requestContextMiddleware = moduleFixture.get(RequestContextMiddleware);
    app.use((req: Request, _res: Response, next: NextFunction) => {
      requestContextMiddleware.use(req, _res, next);
    });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
        validationError: { target: false, value: false },
      }),
    );
    app.useGlobalInterceptors(moduleFixture.get(ResponseEnvelopeInterceptor));
    app.useGlobalFilters(moduleFixture.get(HttpExceptionFilter));
    jwtService = moduleFixture.get(JwtService);

    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  function signToken(userId = 'test-user-id'): string {
    return jwtService.sign({ role: 'FREELANCER', sub: userId });
  }

  // =========================================================================
  // US1: GET /api/v1/ai-reviews
  // =========================================================================
  describe('GET /api/v1/ai-reviews', () => {
    it('T009: returns 401 without JWT', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ai-reviews')
        .expect(401);

      expectErrorCode(response, ErrorCode.UNAUTHORIZED, 401);
    });

    it('T010: returns 400 with invalid status query param', async () => {
      const token = signToken();

      const response = await request(app.getHttpServer())
        .get('/api/v1/ai-reviews')
        .set('Authorization', `Bearer ${token}`)
        .query({ status: 'INVALID' })
        .expect(400);

      expectErrorCode(response, ErrorCode.VALIDATION_ERROR, 400);
    });

    it('T011: returns 400 with limit=51', async () => {
      const token = signToken();

      const response = await request(app.getHttpServer())
        .get('/api/v1/ai-reviews')
        .set('Authorization', `Bearer ${token}`)
        .query({ limit: '51' })
        .expect(400);

      expectErrorCode(response, ErrorCode.VALIDATION_ERROR, 400);
    });

    it('returns 200 with valid response when authenticated', async () => {
      const token = signToken();
      const review = createReviewResponse();
      const listResponse: AiReviewListResponseDto = { reviews: [review], total: 1 };

      aiReviewServiceMock.findAll.mockResolvedValue(listResponse);

      const response = await request(app.getHttpServer())
        .get('/api/v1/ai-reviews')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            reviews: expect.any(Array),
            total: expect.any(Number),
          }),
        }),
      );
    });
  });

  // =========================================================================
  // US2: GET /api/v1/ai-reviews/:id
  // =========================================================================
  describe('GET /api/v1/ai-reviews/:id', () => {
    it('T017: returns 401 without JWT', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ai-reviews/31ddf8a4-cb55-4d38-b91b-9cdd15f0b7f1')
        .expect(401);

      expectErrorCode(response, ErrorCode.UNAUTHORIZED, 401);
    });

    it('T018: returns 404 for non-existent review', async () => {
      const token = signToken();
      const nonExistentId = '11111111-1111-4111-8111-111111111111';

      aiReviewServiceMock.findOne.mockRejectedValue(
        new AppException({ code: ErrorCode.AI_REVIEW_NOT_FOUND }),
      );

      const response = await request(app.getHttpServer())
        .get(`/api/v1/ai-reviews/${nonExistentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expectErrorCode(response, ErrorCode.AI_REVIEW_NOT_FOUND, 404);
    });

    it('returns 200 with full review when found', async () => {
      const token = signToken();
      const review = createReviewResponse();

      aiReviewServiceMock.findOne.mockResolvedValue(review);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/ai-reviews/${review.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: review.id,
            matchScore: review.matchScore,
          }),
        }),
      );
    });
  });

  // =========================================================================
  // US3: POST /api/v1/portal/:token/deliveries/:id/open-ai-review
  // =========================================================================
  describe('POST /api/v1/portal/:token/deliveries/:id/open-ai-review', () => {
    it('T021: returns 201 with valid token and delivery', async () => {
      const portalToken = 'valid-portal-token-xyz';
      const deliveryId = '0fed4321-09bc-4654-8210-fedcba987654';
      const review = createReviewResponse({ deliveryId });

      aiReviewServiceMock.openReview.mockResolvedValue(review);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/portal/${portalToken}/deliveries/${deliveryId}/open-ai-review`)
        .send({ objection: 'Test objection for the portal' })
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            matchScore: expect.any(Number),
            recommendation: expect.any(String),
          }),
        }),
      );
    });

    it('T022: returns 409 when active review exists', async () => {
      const portalToken = 'valid-portal-token-xyz';
      const deliveryId = '0fed4321-09bc-4654-8210-fedcba987654';

      aiReviewServiceMock.openReview.mockRejectedValue(
        new AppException({ code: ErrorCode.AI_REVIEW_ALREADY_COMPLETED }),
      );

      const response = await request(app.getHttpServer())
        .post(`/api/v1/portal/${portalToken}/deliveries/${deliveryId}/open-ai-review`)
        .send({ objection: 'Test objection for the portal' })
        .expect(409);

      expectErrorCode(response, ErrorCode.AI_REVIEW_ALREADY_COMPLETED, 409);
    });

    it('T023: returns 404 for non-existent delivery', async () => {
      const portalToken = 'valid-portal-token-xyz';
      const deliveryId = '11111111-1111-4111-8111-111111111111';

      aiReviewServiceMock.openReview.mockRejectedValue(
        new AppException({ code: ErrorCode.DELIVERY_NOT_FOUND }),
      );

      const response = await request(app.getHttpServer())
        .post(`/api/v1/portal/${portalToken}/deliveries/${deliveryId}/open-ai-review`)
        .send({ objection: 'Test objection for the portal' })
        .expect(404);

      expectErrorCode(response, ErrorCode.DELIVERY_NOT_FOUND, 404);
    });
  });

  // =========================================================================
  // US4: POST /api/v1/ai/review-payment-release
  // =========================================================================
  describe('POST /api/v1/ai/review-payment-release', () => {
    it('T025: returns 201 with valid JWT and owned agreement', async () => {
      const token = signToken('user-freelancer-1');
      const review = createReviewResponse({ requestedByRole: TimelineActorRole.FREELANCER });

      aiReviewServiceMock.reviewPaymentRelease.mockResolvedValue(review);

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/review-payment-release')
        .set('Authorization', `Bearer ${token}`)
        .send({
          agreementId: 'f7c5b8d4-2c1a-4d2c-9d5e-2a4b6c8d0e2f',
          deliveryId: '0fed4321-09bc-4654-8210-fedcba987654',
          milestoneId: 'a1b2c3d4-e5f6-4890-9234-567890abcdef',
          objection: 'Test objection for the portal',
        })
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: expect.any(String),
            requestedByRole: 'FREELANCER',
          }),
        }),
      );
    });

    it('T026: returns 401 without JWT', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/review-payment-release')
        .send({
          agreementId: 'f7c5b8d4-2c1a-4d2c-9d5e-2a4b6c8d0e2f',
          deliveryId: '0fed4321-09bc-4654-8210-fedcba987654',
          milestoneId: 'a1b2c3d4-e5f6-4890-9234-567890abcdef',
          objection: 'Test objection for the portal',
        })
        .expect(401);

      expectErrorCode(response, ErrorCode.UNAUTHORIZED, 401);
    });
  });

  // =========================================================================
  // US5: POST /api/v1/ai-reviews/:id/accept-recommendation
  // =========================================================================
  describe('POST /api/v1/ai-reviews/:id/accept-recommendation', () => {
    it('T028: returns 401 without JWT', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai-reviews/31ddf8a4-cb55-4d38-b91b-9cdd15f0b7f1/accept-recommendation')
        .send({})
        .expect(401);

      expectErrorCode(response, ErrorCode.UNAUTHORIZED, 401);
    });

    it('T029: returns 404 for non-existent review', async () => {
      const token = signToken();
      const nonExistentId = '11111111-1111-4111-8111-111111111111';

      aiReviewServiceMock.acceptRecommendation.mockRejectedValue(
        new AppException({ code: ErrorCode.AI_REVIEW_NOT_FOUND }),
      );

      const response = await request(app.getHttpServer())
        .post(`/api/v1/ai-reviews/${nonExistentId}/accept-recommendation`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(404);

      expectErrorCode(response, ErrorCode.AI_REVIEW_NOT_FOUND, 404);
    });

    it('T030: returns 409 for already-accepted review', async () => {
      const token = signToken();
      const reviewId = '31ddf8a4-cb55-4d38-b91b-9cdd15f0b7f1';

      aiReviewServiceMock.acceptRecommendation.mockRejectedValue(
        new AppException({ code: ErrorCode.AI_REVIEW_ALREADY_COMPLETED }),
      );

      const response = await request(app.getHttpServer())
        .post(`/api/v1/ai-reviews/${reviewId}/accept-recommendation`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(409);

      expectErrorCode(response, ErrorCode.AI_REVIEW_ALREADY_COMPLETED, 409);
    });
  });
});
