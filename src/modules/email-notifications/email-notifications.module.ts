import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import {
  EmailNotificationsController,
  EmailsController,
  NotificationsController,
} from './email-notifications.controller';
import { EmailNotificationsService } from './email-notifications.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    EmailNotificationsController,
    EmailsController,
    NotificationsController,
  ],
  providers: [EmailNotificationsService],
  exports: [EmailNotificationsService],
})
export class EmailNotificationsModule {}
