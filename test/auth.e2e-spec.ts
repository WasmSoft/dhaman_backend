import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { User, UserRole as PrismaUserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
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
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';

const TEST_JWT_SECRET = 'phase-5-auth-e2e-secret';
const TEST_JWT_EXPIRES_IN = '1h';

type FindUniqueArgs = {
  where: {
    email?: string;
    id?: string;
  };
};

type CreateUserArgs = {
  data: {
    email: string;
    name: string;
    passwordHash: string;
    role: PrismaUserRole;
  };
};

function createUser(overrides: Partial<User> = {}): User {
  return {
    avatarUrl: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    email: 'sara@example.com',
    id: 'user-1',
    name: 'Sara Ahmed',
    passwordHash: 'hashed-password',
    role: PrismaUserRole.FREELANCER,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createPrismaMock(users: User[]) {
  let userSequence = 0;

  return {
    user: {
      create: jest.fn(async ({ data }: CreateUserArgs) => {
        const user = createUser({
          email: data.email,
          id: `user-${++userSequence}`,
          name: data.name,
          passwordHash: data.passwordHash,
          role: data.role,
        });

        users.push(user);
        return user;
      }),
      findUnique: jest.fn(async ({ where }: FindUniqueArgs) => {
        if (where.email) {
          return users.find((user) => user.email === where.email) ?? null;
        }

        if (where.id) {
          return users.find((user) => user.id === where.id) ?? null;
        }

        return null;
      }),
    },
  };
}

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

describe('Auth endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let users: User[];

  beforeAll(async () => {
    users = [];
    const prismaMock = createPrismaMock(users);
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
      controllers: [AuthController],
      providers: [
        AuthService,
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
              if (key === 'jwt.secret') {
                return TEST_JWT_SECRET;
              }

              if (key === 'jwt.expiresIn') {
                return TEST_JWT_EXPIRES_IN;
              }

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
    users.length = 0;
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedUser(overrides: Partial<User> = {}): Promise<User> {
    const user = createUser({
      passwordHash: await bcrypt.hash('Str0ngPassw0rd!', 12),
      ...overrides,
    });
    users.push(user);
    return user;
  }

  function signToken(user: User): string {
    return jwtService.sign({ role: user.role, sub: user.id });
  }

  describe('POST /api/v1/auth/register', () => {
    it('creates a freelancer account and returns a token with safe profile data', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'SARA@Example.COM',
          name: 'Sara Ahmed',
          password: 'Str0ngPassw0rd!',
        })
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          data: {
            accessToken: expect.any(String),
            user: {
              avatarUrl: null,
              email: 'sara@example.com',
              id: 'user-1',
              name: 'Sara Ahmed',
              role: PrismaUserRole.FREELANCER,
            },
          },
          meta: { requestId: expect.any(String) },
          success: true,
        }),
      );
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
      expect(users[0].passwordHash).not.toBe('Str0ngPassw0rd!');
    });

    it('returns AUTH_EMAIL_ALREADY_EXISTS for duplicate emails', async () => {
      await seedUser({ email: 'sara@example.com' });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'SARA@example.com',
          name: 'Sara Ahmed',
          password: 'Str0ngPassw0rd!',
        })
        .expect(409);

      expectErrorCode(response, ErrorCode.AUTH_EMAIL_ALREADY_EXISTS);
    });

    it('returns VALIDATION_ERROR for invalid registration input', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'short',
        })
        .expect(400);

      expectErrorCode(response, ErrorCode.VALIDATION_ERROR);
      expect(response.body.error.fieldErrors).toEqual(expect.any(Array));
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns a token for valid credentials', async () => {
      const user = await seedUser({ email: 'sara@example.com' });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'SARA@Example.COM',
          password: 'Str0ngPassw0rd!',
        })
        .expect(200);

      expect(response.body.data).toEqual({
        accessToken: expect.any(String),
        user: {
          avatarUrl: null,
          email: 'sara@example.com',
          id: user.id,
          name: 'Sara Ahmed',
          role: PrismaUserRole.FREELANCER,
        },
      });
    });

    it('returns AUTH_INVALID_CREDENTIALS for a wrong password', async () => {
      await seedUser({ email: 'sara@example.com' });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'sara@example.com',
          password: 'wrong-password',
        })
        .expect(401);

      expectErrorCode(response, ErrorCode.AUTH_INVALID_CREDENTIALS);
    });

    it('returns AUTH_INVALID_CREDENTIALS for an unknown email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'missing@example.com',
          password: 'Str0ngPassw0rd!',
        })
        .expect(401);

      expectErrorCode(response, ErrorCode.AUTH_INVALID_CREDENTIALS);
    });

    it('returns VALIDATION_ERROR for missing login fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);

      expectErrorCode(response, ErrorCode.VALIDATION_ERROR);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns the current authenticated user profile', async () => {
      const user = await seedUser({ id: 'user-me' });

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${signToken(user)}`)
        .expect(200);

      expect(response.body.data).toEqual({
        avatarUrl: null,
        email: 'sara@example.com',
        id: 'user-me',
        name: 'Sara Ahmed',
        role: PrismaUserRole.FREELANCER,
      });
    });

    it('returns UNAUTHORIZED when the token is missing', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);

      expectErrorCode(response, ErrorCode.UNAUTHORIZED);
    });

    it('returns AUTH_TOKEN_INVALID when the token is malformed', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer not-a-valid-token')
        .expect(401);

      expectErrorCode(response, ErrorCode.AUTH_TOKEN_INVALID);
    });

    it('returns AUTH_TOKEN_EXPIRED when the token is expired', async () => {
      const user = await seedUser({ id: 'expired-user' });
      const expiredToken = jwtService.sign(
        { role: user.role, sub: user.id },
        { expiresIn: '-1s' },
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expectErrorCode(response, ErrorCode.AUTH_TOKEN_EXPIRED);
    });

    it('returns AUTH_USER_NOT_FOUND when the token user was deleted', async () => {
      const token = jwtService.sign({
        role: PrismaUserRole.FREELANCER,
        sub: 'deleted-user',
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expectErrorCode(response, ErrorCode.AUTH_USER_NOT_FOUND);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('confirms logout for authenticated users', async () => {
      const user = await seedUser({ id: 'logout-user' });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${signToken(user)}`)
        .expect(200);

      expect(response.body.data).toEqual({ message: 'Logged out' });
    });

    it('returns UNAUTHORIZED when logout is requested without a token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);

      expectErrorCode(response, ErrorCode.UNAUTHORIZED);
    });

    it('returns AUTH_TOKEN_INVALID when logout receives a malformed token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer not-a-valid-token')
        .expect(401);

      expectErrorCode(response, ErrorCode.AUTH_TOKEN_INVALID);
    });

    it('returns AUTH_TOKEN_EXPIRED when logout receives an expired token', async () => {
      const user = await seedUser({ id: 'expired-logout-user' });
      const expiredToken = jwtService.sign(
        { role: user.role, sub: user.id },
        { expiresIn: '-1s' },
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expectErrorCode(response, ErrorCode.AUTH_TOKEN_EXPIRED);
    });
  });
});
