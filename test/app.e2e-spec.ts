import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ClsService } from '../src/common/cls/cls.service';
import { RequestContextMiddleware } from '../src/common/cls/request-context.middleware';
import { ResponseEnvelopeInterceptor } from '../src/common/interceptors/response-envelope.interceptor';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        ClsService,
        RequestContextMiddleware,
        ResponseEnvelopeInterceptor,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalInterceptors(moduleFixture.get(ResponseEnvelopeInterceptor));
    app.use(moduleFixture.get(RequestContextMiddleware).use.bind(moduleFixture.get(RequestContextMiddleware)));
    await app.init();
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({
          success: true,
          data: {
            service: 'dhaman-backend',
            status: 'ok',
            phase: 0,
          },
          meta: {
            requestId: expect.any(String),
          },
        });
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
