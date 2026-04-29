import {
  Controller,
  INestApplication,
  Injectable,
  MiddlewareConsumer,
  Module,
  NestModule,
  NestMiddleware,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { ClsService } from '../src/common/cls/cls.service';
import { RequestContextMiddleware } from '../src/common/cls/request-context.middleware';
import { ErrorCode } from '../src/common/enums/error-code.enum';
import { Locale } from '../src/common/enums/locale.enum';
import { AppException } from '../src/common/errors/app-exception';
import { ErrorTranslatorService } from '../src/common/errors/error-translator.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { ResponseEnvelopeInterceptor } from '../src/common/interceptors/response-envelope.interceptor';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';

type TestUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

type TestProfile = {
  id: string;
  userId: string;
  businessName: string | null;
  bio: string | null;
  specialization: string | null;
  preferredCurrency: string;
  locale: string;
  createdAt: Date;
  updatedAt: Date;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function omitPasswordHash(user: TestUser) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function createPrismaMock() {
  const initialUser: TestUser = {
    id: 'user-1',
    name: 'أحمد محمد',
    email: 'ahmed@example.com',
    role: UserRole.FREELANCER,
    avatarUrl: null,
    passwordHash: '$2b$10$secret',
    createdAt: new Date('2026-01-15T10:00:00.000Z'),
    updatedAt: new Date('2026-04-20T14:30:00.000Z'),
  };

  const initialState = {
    users: new Map<string, TestUser>([['user-1', clone(initialUser)]]),
    profiles: new Map<string, TestProfile>(),
    profileSequence: 1,
  };

  const state = {
    users: new Map<string, TestUser>(),
    profiles: new Map<string, TestProfile>(),
    profileSequence: 1,
  };

  const reset = () => {
    state.users = new Map(
      Array.from(initialState.users.entries()).map(([key, value]) => [
        key,
        clone(value),
      ]),
    );
    state.profiles = new Map(
      Array.from(initialState.profiles.entries()).map(([key, value]) => [
        key,
        clone(value),
      ]),
    );
    state.profileSequence = initialState.profileSequence;
  };

  const userFindUnique = jest.fn(({ where, select, omit }) => {
    const user = state.users.get(where.id) ?? null;

    if (!user) {
      return Promise.resolve(null);
    }

    if (select) {
      return Promise.resolve({ id: user.id });
    }

    if (omit?.passwordHash) {
      return Promise.resolve(omitPasswordHash(clone(user)));
    }

    return Promise.resolve(clone(user));
  });

  const userUpdate = jest.fn(({ where, data, omit }) => {
    const existingUser = state.users.get(where.id);

    if (!existingUser) {
      return Promise.reject({ code: 'P2025' });
    }

    const updatedUser: TestUser = {
      ...existingUser,
      ...data,
      updatedAt: new Date('2026-04-29T09:00:00.000Z'),
    };

    state.users.set(where.id, updatedUser);

    if (omit?.passwordHash) {
      return Promise.resolve(omitPasswordHash(clone(updatedUser)));
    }

    return Promise.resolve(clone(updatedUser));
  });

  const userSettingsUpsert = jest.fn(({ where, create, update }) => {
    const existingProfile = state.profiles.get(where.userId);

    if (!existingProfile) {
      const createdProfile: TestProfile = {
        id: `settings-${state.profileSequence++}`,
        businessName: null,
        bio: null,
        specialization: null,
        preferredCurrency: 'SAR',
        locale: 'ar',
        createdAt: new Date('2026-01-15T10:00:00.000Z'),
        updatedAt: new Date('2026-04-20T14:30:00.000Z'),
        ...create,
      };

      state.profiles.set(where.userId, createdProfile);
      return Promise.resolve(clone(createdProfile));
    }

    const updatedProfile: TestProfile = {
      ...existingProfile,
      ...update,
      updatedAt: new Date('2026-04-29T09:00:00.000Z'),
    };

    state.profiles.set(where.userId, updatedProfile);
    return Promise.resolve(clone(updatedProfile));
  });

  reset();

  return {
    prisma: {
      user: {
        findUnique: userFindUnique,
        update: userUpdate,
      },
      userSettings: {
        upsert: userSettingsUpsert,
      },
    },
    state,
    reset,
  };
}

@Injectable()
class TestAuthMiddleware implements NestMiddleware {
  use(
    request: Request & { user?: { id: string; role: UserRole } },
    _response: Response,
    next: NextFunction,
  ): void {
    const authorization = request.header('authorization');

    if (authorization === 'Bearer valid-jwt') {
      request.user = {
        id: 'user-1',
        role: UserRole.FREELANCER,
      };
    }

    if (authorization === 'Bearer missing-user-jwt') {
      request.user = {
        id: 'missing-user',
        role: UserRole.FREELANCER,
      };
    }

    next();
  }
}

@Controller()
class EmptyController {}

@Module({
  controllers: [UsersController, EmptyController],
  providers: [
    UsersService,
    ClsService,
    ErrorTranslatorService,
    HttpExceptionFilter,
    ResponseEnvelopeInterceptor,
    {
      provide: PrismaService,
      useValue: {},
    },
    JwtAuthGuard,
  ],
})
class UsersE2eTestModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware, TestAuthMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
  }
}

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeAll(async () => {
    prismaMock = createPrismaMock();

    moduleFixture = await Test.createTestingModule({
      imports: [UsersE2eTestModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock.prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: false,
        transform: true,
        whitelist: true,
        validationError: {
          target: false,
          value: false,
        },
      }),
    );
    app.useGlobalInterceptors(moduleFixture.get(ResponseEnvelopeInterceptor));
    app.useGlobalFilters(moduleFixture.get(HttpExceptionFilter));
    await app.init();
  });

  beforeEach(() => {
    prismaMock.reset();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/users/me with a valid JWT returns the current user without passwordHash', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer valid-jwt')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: 'user-1',
        email: 'ahmed@example.com',
        role: UserRole.FREELANCER,
      }),
    );
    expect(response.body.data).not.toHaveProperty('passwordHash');
  });

  it('GET /api/v1/users/me without a JWT returns UNAUTHORIZED', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
  });

  it('PATCH /api/v1/users/me updates the display name and strips immutable email from the request body', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', 'Bearer valid-jwt')
      .send({
        name: 'اسم محدث',
        email: 'changed@example.com',
      })
      .expect(200);

    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: 'user-1',
        name: 'اسم محدث',
        email: 'ahmed@example.com',
      }),
    );
    expect(prismaMock.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: 'اسم محدث' },
      }),
    );
  });

  it('PATCH /api/v1/users/me with an invalid avatarUrl returns VALIDATION_ERROR', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', 'Bearer valid-jwt')
      .send({ avatarUrl: 'not-a-url' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it('GET /api/v1/users/me/profile first time creates default settings', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me/profile')
      .set('Authorization', 'Bearer valid-jwt')
      .expect(200);

    expect(response.body.data).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        preferredCurrency: 'SAR',
        locale: 'ar',
      }),
    );
    expect(prismaMock.state.profiles.get('user-1')).toEqual(
      expect.objectContaining({
        preferredCurrency: 'SAR',
        locale: 'ar',
      }),
    );
  });

  it('PATCH /api/v1/users/me/profile updates bio', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/v1/users/me/profile')
      .set('Authorization', 'Bearer valid-jwt')
      .send({ bio: 'نبذة محدثة' })
      .expect(200);

    expect(response.body.data).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        bio: 'نبذة محدثة',
      }),
    );
  });

  it('PATCH /api/v1/users/me/profile with an invalid currency returns VALIDATION_ERROR', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/v1/users/me/profile')
      .set('Authorization', 'Bearer valid-jwt')
      .send({ preferredCurrency: 'XYZ' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it('GET /api/v1/users/me returns AUTH_USER_NOT_FOUND when the authenticated user record is missing', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer missing-user-jwt')
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe(ErrorCode.AUTH_USER_NOT_FOUND);
  });
});
