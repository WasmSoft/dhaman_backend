import { Injectable } from '@nestjs/common';
import {
  EmailPreviewDto,
  SendTestEmailDto,
} from './dto/email-notifications.dto';

/**
 * Module responsibility:
 * - Prepare email previews and outbound notification orchestration.
 * Main entities touched:
 * - EmailNotification, Agreement.
 * Expected endpoints:
 * - POST /email-notifications/preview
 * - POST /email-notifications/send-test
 * Business rules:
 * - Keep provider-specific logic behind a service boundary.
 * - Record send attempts and failures.
 * Implementation phases:
 * - Phase 6.
 * Error cases to document:
 * - EMAIL_TEMPLATE_NOT_FOUND, EMAIL_RECIPIENT_REQUIRED, EMAIL_SEND_FAILED.
 * Testing cases to cover:
 * - preview generation, test send, provider failure handling.
 */
@Injectable()
export class EmailNotificationsService {
  preview(dto: EmailPreviewDto) {
    return this.placeholder('preview', { dto });
  }

  sendTest(dto: SendTestEmailDto) {
    return this.placeholder('sendTest', { dto });
  }

  private placeholder(action: string, details?: Record<string, unknown>) {
    return {
      module: 'email-notifications',
      action,
      phase: 0,
      status: 'not-implemented',
      ...details,
    };
  }
}
