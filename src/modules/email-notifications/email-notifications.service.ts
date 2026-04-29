import { NotificationStatus, NotificationType } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  preview(dto: EmailPreviewDto) {
    return this.placeholder('preview', { dto });
  }

  sendTest(dto: SendTestEmailDto) {
    return this.placeholder('sendTest', { dto });
  }

  // AR: ينشئ سجل إشعار معلق لإبلاغ المستقل بفتح مراجعة ذكاء اصطناعي جديدة.
  // EN: Creates a pending notification record to inform the freelancer that an AI review was opened.
  async enqueueAiReviewOpenedForFreelancer(input: {
    agreementId: string;
    recipientEmail: string;
    aiReviewId: string;
    deliveryId: string;
    milestoneId: string;
  }): Promise<void> {
    if (!input.recipientEmail.trim()) {
      throw new AppException({ code: ErrorCode.EMAIL_RECIPIENT_REQUIRED });
    }

    await this.prisma.emailNotification.create({
      data: {
        agreementId: input.agreementId,
        recipientEmail: input.recipientEmail,
        type: NotificationType.AI_REVIEW_READY,
        subject: 'AI review opened for your delivery',
        status: NotificationStatus.PENDING,
      },
    });
  }

  // AR: ينشئ سجل إشعار معلق لإبلاغ العميل بقبول التوصية.
  // EN: Creates a pending notification record to inform the client that the recommendation was accepted.
  async enqueueAiReviewRecommendationAcceptedForClient(input: {
    agreementId: string;
    recipientEmail: string;
    recommendation: string;
    paymentStatus: string;
  }): Promise<void> {
    if (!input.recipientEmail.trim()) {
      throw new AppException({ code: ErrorCode.EMAIL_RECIPIENT_REQUIRED });
    }

    await this.prisma.emailNotification.create({
      data: {
        agreementId: input.agreementId,
        recipientEmail: input.recipientEmail,
        type: NotificationType.AI_REVIEW_RECOMMENDATION_ACCEPTED,
        subject: `AI recommendation ${input.recommendation.toLowerCase()} - payment ${input.paymentStatus.toLowerCase()}`,
        status: NotificationStatus.PENDING,
      },
    });
  }

  // EN: Creates a PENDING notification record for the client agreement invite.
  // AR: ينشئ سجل إشعار معلق لدعوة العميل لمراجعة الاتفاقية.
  async enqueueAgreementInvite(input: {
    agreementId: string;
    recipientEmail: string;
    clientName: string;
    agreementTitle: string;
    inviteToken: string;
  }): Promise<void> {
    if (!input.recipientEmail.trim()) {
      throw new AppException({ code: ErrorCode.EMAIL_RECIPIENT_REQUIRED });
    }

    await this.prisma.emailNotification.create({
      data: {
        agreementId: input.agreementId,
        recipientEmail: input.recipientEmail,
        type: NotificationType.AGREEMENT_INVITE,
        subject: `Agreement invitation: ${input.agreementTitle}`,
        status: NotificationStatus.PENDING,
      },
    });
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
