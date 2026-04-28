import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  EmailPreviewDto,
  SendTestEmailDto,
} from './dto/email-notifications.dto';
import { EmailNotificationsService } from './email-notifications.service';

@ApiTags('Email Notifications')
@Controller('email-notifications')
export class EmailNotificationsController {
  constructor(
    private readonly emailNotificationsService: EmailNotificationsService,
  ) {}

  @Post('preview')
  preview(@Body() dto: EmailPreviewDto) {
    return this.emailNotificationsService.preview(dto);
  }

  @Post('send-test')
  sendTest(@Body() dto: SendTestEmailDto) {
    return this.emailNotificationsService.sendTest(dto);
  }
}
