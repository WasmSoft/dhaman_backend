/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
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
import { ErrorTranslatorModule } from '../src/common/errors/error-translator.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { ResponseEnvelopeInterceptor } from '../src/common/interceptors/response-envelope.interceptor';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { ClientsController } from '../src/modules/clients/clients.controller';
import { ClientsService } from '../src/modules/clients/clients.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';

const TEST_JWT_SECRET = 'clients-reuse-summary-e2e-secret';
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

describe('Clients Summary endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let prismaMock: PrismaService;

  const freelancerA = {
    id: 'freelancer-a-1',
    email: 'a@example.com',
    name: 'Freelancer A',
  };
  const _freelancerB = {
    id: 'freelancer-b-1',
    email: 'b@example.com',
    name: 'Freelancer B',
  };
  void _freelancerB;

  function signToken(userId: string, role = 'FREELANCER'): string {
    return jwtService.sign({ role, sub: userId });
  }

  beforeAll(async () => {
    prismaMock = {
      client: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue(null),
      },
      agreement: {
        findMany: jest.fn().mockResolvedValue([]),
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
      controllers: [ClientsController],
      providers: [
        ClientsService,
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

  describe('GET /api/v1/clients/:id/summary', () => {
    it('returns UNAUTHORIZED without an Authorization header', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/clients/client-id-1/summary')
        .expect(401);

      expectErrorCode(response, ErrorCode.UNAUTHORIZED);
    });

    it('returns a successful summary for an authenticated freelancer with an owned client', async () => {
      const tokenA = signToken(freelancerA.id);
      const clientId = 'c1a2b3c4-d5e6-7890-abcd-ef1234567890';
      const client = {
        id: clientId,
        freelancerId: freelancerA.id,
        name: 'Client Name',
        email: 'client@example.sa',
        phone: null,
        companyName: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      (prismaMock.client.findFirst as jest.Mock).mockResolvedValue(client);
      (prismaMock.agreement.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          status: 'ACTIVE',
          title: 'Agreement 1',
          totalAmount: { toNumber: () => 15000 },
          currency: 'SAR',
          createdAt: new Date('2026-04-20'),
          milestones: [
            {
              amount: { toNumber: () => 10000 },
              currency: 'SAR',
              paymentStatus: 'RELEASED',
            },
            {
              amount: { toNumber: () => 5000 },
              currency: 'SAR',
              paymentStatus: 'PENDING',
            },
          ],
        },
      ]);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/clients/${clientId}/summary`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.client.id).toBe(clientId);
      expect(response.body.data.agreements.total).toBe(1);
      expect(response.body.data.payments).toEqual({
        totalAmount: 15000,
        releasedAmount: 10000,
        pendingAmount: 5000,
        currency: 'SAR',
      });
      expect(response.body.data.recentAgreements.length).toBe(1);
      expect(response.body.data.recentAgreements[0].currency).toBe('SAR');
    });

    it('returns zero-value summary for a client with no agreements', async () => {
      const tokenA = signToken(freelancerA.id);
      const clientId = 'c1a2b3c4-d5e6-7890-abcd-ef1234567890';
      const client = {
        id: clientId,
        freelancerId: freelancerA.id,
        name: 'Client Name',
        email: 'client@example.sa',
        phone: null,
        companyName: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      (prismaMock.client.findFirst as jest.Mock).mockResolvedValue(client);
      (prismaMock.agreement.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/clients/${clientId}/summary`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(response.body.data.payments.currency).toBeNull();
      expect(response.body.data.payments.totalAmount).toBe(0);
      expect(response.body.data.agreements.total).toBe(0);
      expect(response.body.data.recentAgreements).toEqual([]);
    });

    it('returns CLIENT_NOT_FOUND for a missing client', async () => {
      const tokenA = signToken(freelancerA.id);
      (prismaMock.client.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/v1/clients/a1b2c3d4-e5f6-7890-abcd-ef1234567890/summary')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);

      expectErrorCode(response, ErrorCode.CLIENT_NOT_FOUND);
    });

    it('returns CLIENT_NOT_FOUND for a client owned by another freelancer', async () => {
      const tokenA = signToken(freelancerA.id);
      (prismaMock.client.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/v1/clients/b1b2c3d4-e5f6-7890-abcd-ef1234567890/summary')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);

      expectErrorCode(response, ErrorCode.CLIENT_NOT_FOUND);
    });

    it('returns CLIENT_SUMMARY_MIXED_CURRENCY for mixed milestone currencies', async () => {
      const tokenA = signToken(freelancerA.id);
      const clientId = 'c1a2b3c4-d5e6-7890-abcd-ef1234567890';
      const client = {
        id: clientId,
        freelancerId: freelancerA.id,
        name: 'Client Name',
        email: 'client@example.sa',
        phone: null,
        companyName: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      (prismaMock.client.findFirst as jest.Mock).mockResolvedValue(client);
      (prismaMock.agreement.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          status: 'ACTIVE',
          title: 'Agreement 1',
          totalAmount: { toNumber: () => 5000 },
          currency: 'SAR',
          createdAt: new Date('2026-04-20'),
          milestones: [
            {
              amount: { toNumber: () => 3000 },
              currency: 'SAR',
              paymentStatus: 'RELEASED',
            },
            {
              amount: { toNumber: () => 2000 },
              currency: 'USD',
              paymentStatus: 'PENDING',
            },
          ],
        },
      ]);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/clients/${clientId}/summary`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(409);

      expectErrorCode(response, ErrorCode.CLIENT_SUMMARY_MIXED_CURRENCY);
    });

    it('returns 400 for an invalid UUID', async () => {
      const tokenA = signToken(freelancerA.id);

      const response = await request(app.getHttpServer())
        .get('/api/v1/clients/not-a-uuid/summary')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(400);

      expectErrorCode(response, ErrorCode.VALIDATION_ERROR);
    });
  });
});
