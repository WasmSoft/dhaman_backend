import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = Array.from(
    new Set([
      'https://panel.dhaman.wasmsoft.com',
      'http://localhost:3000',
      'http://localhost:3083',
      ...(process.env.FRONTEND_URL
        ?.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean) ?? []),
    ]),
  );

  app.use(helmet());
  app.enableCors({
    credentials: true,
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Accept-Language',
    ],
    optionsSuccessStatus: 204,
  });
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
  app.useGlobalInterceptors(
    app.get(RequestLoggingInterceptor),
    app.get(ResponseEnvelopeInterceptor),
  );
  app.useGlobalFilters(
    app.get(PrismaExceptionFilter),
    app.get(HttpExceptionFilter),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Dhaman MVP API')
    .setDescription('Backend API for Dhaman freelancer payment protection MVP')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 8080);
  console.log(`Server running on port ${process.env.PORT ?? 8080}`);
  console.log(
    `Swagger documentation available at http://localhost:${process.env.PORT ?? 8080}/docs`,
  );
}
bootstrap();
