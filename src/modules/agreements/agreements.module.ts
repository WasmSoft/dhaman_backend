import { Module } from '@nestjs/common';
import { EmailNotificationsModule } from '../email-notifications/email-notifications.module';
import { AgreementsController } from './agreements.controller';
import { AgreementsService } from './agreements.service';

@Module({
  imports: [EmailNotificationsModule],
  controllers: [AgreementsController],
  providers: [AgreementsService],
})
export class AgreementsModule {}
