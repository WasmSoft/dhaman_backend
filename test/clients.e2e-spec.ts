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

const TEST_JWT_SECRET = 'clients-crud-e2e-secret';
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

describe('Clients CRUD endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let prismaMock: PrismaService;

  const freelancerA = {
    id: 'freelancer-a-id',
    email: 'a@example.sa',
  };
  const freelancerB = {
    id: 'freelancer-b-id',
    email: 'b@example.sa',
  };

  const mockClient = {
    id: 'c1a2b3c4-d5e6-7890-abcd-ef1234567890',
    freelancerId: freelancerA.id,
    name: 'شركة التقنية',
    email: 'client@example.sa',
    phone: '+966501234567',
    companyName: 'شركة التقنية للحلول',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

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
      $transaction: jest.fn().mockResolvedValue([[], 0]),
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

  describe('POST /api/v1/clients', () => {
    it('creates client with valid body and returns 201', async () => {
      const tokenA = signToken(freelancerA.id);
      (prismaMock.client.create as jest.Mock).mockResolvedValue(mockClient);

      const response = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'شركة التقنية',
          email: 'client@example.sa',
          phone: '+966501234567',
          companyName: 'شركة التقنية للحلول',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(mockClient.id);
      expect(response.body.data.name).toBe(mockClient.name);
      expect(response.body.data.email).toBe(mockClient.email);
    });

    it('returns normalized email in response', async () => {
      const tokenA = signToken(freelancerA.id);
      const normalizedClient = { ...mockClient, email: 'client@example.sa' };
      (prismaMock.client.create as jest.Mock).mockResolvedValue(
        normalizedClient,
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Client',
          email: 'CLIENT@EXAMPLE.SA',
        })
        .expect(201);

      expect(response.body.data.email).toBe('client@example.sa');
    });

    it('duplicate email returns CLIENT_EMAIL_ALREADY_EXISTS', async () => {
      const tokenA = signToken(freelancerA.id);
      const prismaError = new Error('Unique constraint failed') as Error & {
        code: string;
      };
      prismaError.code = 'P2002';
      (prismaMock.client.create as jest.Mock).mockRejectedValue(prismaError);

      const response = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Client',
          email: 'duplicate@example.sa',
        })
        .expect(409);

      expectErrorCode(response, ErrorCode.CLIENT_EMAIL_ALREADY_EXISTS);
    });

    it('returns UNAUTHORIZED without Authorization header', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'Client',
          email: 'client@example.sa',
        })
        .expect(401);

      expectErrorCode(response, ErrorCode.UNAUTHORIZED);
    });

    it('missing required name returns VALIDATION_ERROR', async () => {
      const tokenA = signToken(freelancerA.id);

      const response = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          email: 'client@example.sa',
        })
        .expect(400);

      expectErrorCode(response, ErrorCode.VALIDATION_ERROR);
    });

    it('missing required email returns VALIDATION_ERROR', async () => {
      const tokenA = signToken(freelancerA.id);

      const response = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Client',
        })
        .expect(400);

      expectErrorCode(response, ErrorCode.VALIDATION_ERROR);
    });

    it('invalid email format returns VALIDATION_ERROR', async () => {
      const tokenA = signToken(freelancerA.id);

      const response = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Client',
          email: 'not-an-email',
        })
        .expect(400);

      expectErrorCode(response, ErrorCode.VALIDATION_ERROR);
    });

    it('extra unknown field returns VALIDATION_ERROR', async () => {
      const tokenA = signToken(freelancerA.id);

      const response = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Client',
          email: 'client@example.sa',
          unknownField: 'should be rejected',
        })
        .expect(400);

      expectErrorCode(response, ErrorCode.VALIDATION_ERROR);
    });
  });

  describe('GET /api/v1/clients', () => {
    it('returns paginated list', async () => {
      const tokenA = signToken(freelancerA.id);
      (prismaMock.$transaction as jest.Mock).mockResolvedValue([
        [mockClient],
        1,
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.total).toBe(1);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(20);
      expect(response.body.data.totalPages).toBe(1);
    });

    it('returns empty list', async () => {
      const tokenA = signToken(freelancerA.id);
      (prismaMock.$transaction as jest.Mock).mockResolvedValue([[], 0]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });

    it('with search query param', async () => {
      const tokenA = signToken(freelancerA.id);
      (prismaMock.$transaction as jest.Mock).mockResolvedValue([
        [mockClient],
        1,
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/clients?search=تقنية')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('with custom page and limit', async () => {
      const tokenA = signToken(freelancerA.id);
      (prismaMock.$transaction as jest.Mock).mockResolvedValue([[], 0]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/clients?page=2&limit=5')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(response.body.data.page).toBe(2);
      expect(response.body.data.limit).toBe(5);
    });

    it('page=0 is invalid', async () => {
      const tokenA = signToken(freelancerA.id);

      const response = await request(app.getHttpServer())
        .get('/api/v1/clients?page=0')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(400);

      expectErrorCode(response, ErrorCode.VALIDATION_ERROR);
    });

    it('limit=0 is invalid', async () => {
      const tokenA = signToken(freelancerA.id);

      const response = await request(app.getHttpServer())
        .get('/api/v1/clients?limit=0')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(400);

      expectErrorCode(response, ErrorCode.VALIDATION_ERROR);
    });

    it('limit=101 is invalid', async () => {
      const tokenA = signToken(freelancerA.id);

      const response = await request(app.getHttpServer())
        .get('/api/v1/clients?limit=101')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(400);

      expectErrorCode(response, ErrorCode.VALIDATION_ERROR);
    });

    it('returns UNAUTHORIZED without Authorization header', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/clients')
        .expect(401);

      expectErrorCode(response, ErrorCode.UNAUTHORIZED);
    });
  });

  describe('GET /api/v1/clients/:id', () => {
    it('returns owned client', async () => {
      const tokenA = signToken(freelancerA.id);
      (prismaMock.client.findFirst as jest.Mock).mockResolvedValue(mockClient);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/clients/${mockClient.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(mockClient.id);
      expect(response.body.data.name).toBe(mockClient.name);
      expect(response.body.data.email).toBe(mockClient.email);
    });

    it('returns CLIENT_NOT_FOUND for missing client', async () => {
      const tokenA = signToken(freelancerA.id);
      (prismaMock.client.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/v1/clients/a1b2c3d4-e5f6-7890-abcd-ef1234567890')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);

      expectErrorCode(response, ErrorCode.CLIENT_NOT_FOUND);
    });

    it('returns CLIENT_NOT_FOUND for client owned by another freelancer', async () => {
      const tokenB = signToken(freelancerB.id);
      (prismaMock.client.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/clients/${mockClient.id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);

      expectErrorCode(response, ErrorCode.CLIENT_NOT_FOUND);
    });

    it('returns UNAUTHORIZED without Authorization header', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/clients/${mockClient.id}`)
        .expect(401);

      expectErrorCode(response, ErrorCode.UNAUTHORIZED);
    });

    it('invalid UUID returns VALIDATION_ERROR', async () => {
      const tokenA = signToken(freelancerA.id);

      const response = await request(app.getHttpServer())
        .get('/api/v1/clients/not-a-uuid')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(400);

      expectErrorCode(response, ErrorCode.VALIDATION_ERROR);
    });
  });

  describe('PATCH /api/v1/clients/:id', () => {
    it('partial update succeeds', async () => {
      const tokenA = signToken(freelancerA.id);
      const updatedClient = { ...mockClient, name: 'New Name' };
      (prismaMock.client.findFirst as jest.Mock).mockResolvedValue(mockClient);
      (prismaMock.client.update as jest.Mock).mockResolvedValue(updatedClient);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/clients/${mockClient.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'New Name' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Name');
    });

    it('email conflict returns CLIENT_EMAIL_ALREADY_EXISTS', async () => {
      const tokenA = signToken(freelancerA.id);
      const prismaError = new Error('Unique constraint failed') as Error & {
        code: string;
      };
      prismaError.code = 'P2002';
      (prismaMock.client.findFirst as jest.Mock).mockResolvedValue(mockClient);
      (prismaMock.client.update as jest.Mock).mockRejectedValue(prismaError);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/clients/${mockClient.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ email: 'duplicate@example.sa' })
        .expect(409);

      expectErrorCode(response, ErrorCode.CLIENT_EMAIL_ALREADY_EXISTS);
    });

    it('returns CLIENT_NOT_FOUND for missing client', async () => {
      const tokenA = signToken(freelancerA.id);
      (prismaMock.client.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/clients/a1b2c3d4-e5f6-7890-abcd-ef1234567890')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'X' })
        .expect(404);

      expectErrorCode(response, ErrorCode.CLIENT_NOT_FOUND);
    });

    it('returns CLIENT_NOT_FOUND for client owned by another freelancer', async () => {
      const tokenB = signToken(freelancerB.id);
      (prismaMock.client.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/clients/${mockClient.id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ name: 'X' })
        .expect(404);

      expectErrorCode(response, ErrorCode.CLIENT_NOT_FOUND);
    });

    it('returns UNAUTHORIZED without Authorization header', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/clients/${mockClient.id}`)
        .send({ name: 'X' })
        .expect(401);

      expectErrorCode(response, ErrorCode.UNAUTHORIZED);
    });

    it('invalid UUID returns VALIDATION_ERROR', async () => {
      const tokenA = signToken(freelancerA.id);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/clients/not-a-uuid')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'X' })
        .expect(400);

      expectErrorCode(response, ErrorCode.VALIDATION_ERROR);
    });

    it('invalid field type returns VALIDATION_ERROR', async () => {
      const tokenA = signToken(freelancerA.id);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/clients/${mockClient.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 12345 })
        .expect(400);

      expectErrorCode(response, ErrorCode.VALIDATION_ERROR);
    });
  });
});
