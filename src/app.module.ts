import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClsModule } from './common/cls/cls.module';
import { RequestContextMiddleware } from './common/cls/request-context.middleware';
import { ErrorTranslatorModule } from './common/errors/error-translator.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { aiConfig } from './config/ai.config';
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { emailConfig } from './config/email.config';
import { jwtConfig } from './config/jwt.config';
import { paymentConfig } from './config/payment.config';
import { storageConfig } from './config/storage.config';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { AgreementPoliciesModule } from './modules/agreement-policies/agreement-policies.module';
import { AgreementsModule } from './modules/agreements/agreements.module';
import { AiPlanModule } from './modules/ai-plan/ai-plan.module';
import { AiReviewModule } from './modules/ai-review/ai-review.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChangeRequestsModule } from './modules/change-requests/change-requests.module';
import { ClientPortalModule } from './modules/client-portal/client-portal.module';
import { ClientsModule } from './modules/clients/clients.module';
import { DashboardAnalyticsModule } from './modules/dashboard-analytics/dashboard-analytics.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { EmailNotificationsModule } from './modules/email-notifications/email-notifications.module';
import { MilestonesModule } from './modules/milestones/milestones.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SettingsModule } from './modules/settings/settings.module';
import { TimelineEventsModule } from './modules/timeline-events/timeline-events.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [
        appConfig,
        aiConfig,
        databaseConfig,
        emailConfig,
        jwtConfig,
        paymentConfig,
        storageConfig,
      ],
    }),
    ClsModule,
    ErrorTranslatorModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    AgreementsModule,
    AgreementPoliciesModule,
    MilestonesModule,
    PaymentsModule,
    DeliveriesModule,
    ClientPortalModule,
    AiPlanModule,
    AiReviewModule,
    ChangeRequestsModule,
    TimelineEventsModule,
    EmailNotificationsModule,
    DashboardAnalyticsModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    HttpExceptionFilter,
    PrismaExceptionFilter,
    RequestLoggingInterceptor,
    ResponseEnvelopeInterceptor,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
  }
}
