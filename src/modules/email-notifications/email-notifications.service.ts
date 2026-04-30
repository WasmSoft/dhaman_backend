import {
  AgreementStatus,
  NotificationStatus,
  NotificationType,
  Prisma,
  TimelineActorRole,
  TimelineEventType,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { ClsService } from '../../common/cls/cls.service';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { Locale } from '../../common/enums/locale.enum';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  EmailNotificationResponseDto,
  EmailLogQueryDto,
  EmailPreviewResponseDto,
  PaginatedEmailNotificationsResponseDto,
  PreviewEmailDto,
  SendTestNotificationDto,
} from './dto/email-notifications.dto';

type EmailLocale = 'ar' | 'en';

type TemplateContext = {
  agreement?: {
    id: string;
    title: string;
    description: string;
    serviceType: string;
    totalAmount: string;
    currency: string;
    status: string;
  };
  client?: {
    name: string;
    email: string;
    companyName: string | null;
  };
  freelancer?: {
    name: string;
    email: string;
  };
  metadata: Record<string, unknown>;
  recipientEmail: string | null;
  recipientName: string | null;
};

type RenderedEmail = {
  subject: string;
  previewHtml: string;
  previewText: string;
};

export type SendNotificationInput = {
  agreementId?: string;
  locale?: EmailLocale;
  metadata?: Record<string, unknown>;
  recipientEmail: string;
  recipientName?: string;
  type: NotificationType;
};

type TemplateDefinition = {
  arSubject: string;
  enSubject: string;
  arTitle: string;
  enTitle: string;
  arBody: string;
  enBody: string;
};

const INVITABLE_STATUSES = new Set<AgreementStatus>([
  AgreementStatus.DRAFT,
  AgreementStatus.SENT,
]);

const AGREEMENT_SCOPED_TYPES = new Set<NotificationType>([
  NotificationType.AGREEMENT_INVITE,
  NotificationType.AGREEMENT_APPROVED,
  NotificationType.AGREEMENT_CHANGE_REQUESTED,
  NotificationType.DELIVERY_SUBMITTED,
  NotificationType.DELIVERY_CHANGES_REQUESTED,
  NotificationType.AI_REVIEW_READY,
  NotificationType.AI_REVIEW_RECOMMENDATION_ACCEPTED,
  NotificationType.CHANGE_REQUEST_CREATED,
  NotificationType.CHANGE_REQUEST_APPROVED,
  NotificationType.PAYMENT_RESERVED,
  NotificationType.PAYMENT_READY_TO_RELEASE,
  NotificationType.PAYMENT_RELEASED,
]);

const TEMPLATE_REGISTRY: Record<NotificationType, TemplateDefinition> = {
  [NotificationType.AGREEMENT_INVITE]: {
    arSubject: 'دعوة لمراجعة اتفاق ضمان',
    enSubject: 'Invitation to review a Dhaman agreement',
    arTitle: 'دعوة اتفاق جديدة',
    enTitle: 'New agreement invitation',
    arBody: 'يرجى مراجعة تفاصيل الاتفاق والموافقة أو طلب التعديل.',
    enBody:
      'Please review the agreement details and approve or request changes.',
  },
  [NotificationType.AGREEMENT_APPROVED]: {
    arSubject: 'تمت الموافقة على اتفاق ضمان',
    enSubject: 'Dhaman agreement approved',
    arTitle: 'تمت الموافقة على الاتفاق',
    enTitle: 'Agreement approved',
    arBody: 'وافق العميل على الاتفاق ويمكنك متابعة التنفيذ.',
    enBody: 'The client approved the agreement and work can proceed.',
  },
  [NotificationType.AGREEMENT_CHANGE_REQUESTED]: {
    arSubject: 'طلب تعديل على اتفاق ضمان',
    enSubject: 'Agreement change requested',
    arTitle: 'طلب العميل تعديلا',
    enTitle: 'Client requested changes',
    arBody: 'راجع ملاحظات العميل وعدل الاتفاق عند الحاجة.',
    enBody: 'Review the client notes and update the agreement if needed.',
  },
  [NotificationType.DELIVERY_SUBMITTED]: {
    arSubject: 'تم تسليم مرحلة للمراجعة',
    enSubject: 'Delivery submitted for review',
    arTitle: 'تسليم جديد بانتظار المراجعة',
    enTitle: 'New delivery awaiting review',
    arBody: 'تم إرسال تسليم جديد ضمن الاتفاق.',
    enBody: 'A new delivery has been submitted for this agreement.',
  },
  [NotificationType.DELIVERY_CHANGES_REQUESTED]: {
    arSubject: 'طلب تعديلات على التسليم',
    enSubject: 'Delivery changes requested',
    arTitle: 'تعديلات مطلوبة',
    enTitle: 'Changes requested',
    arBody: 'طلب العميل تعديلات على التسليم.',
    enBody: 'The client requested changes to the delivery.',
  },
  [NotificationType.AI_REVIEW_READY]: {
    arSubject: 'نتيجة مراجعة الذكاء الاصطناعي جاهزة',
    enSubject: 'AI review result is ready',
    arTitle: 'مراجعة الذكاء الاصطناعي جاهزة',
    enTitle: 'AI review ready',
    arBody: 'أصبحت نتيجة المراجعة متاحة داخل ضمان.',
    enBody: 'The review result is now available in Dhaman.',
  },
  [NotificationType.AI_REVIEW_RECOMMENDATION_ACCEPTED]: {
    arSubject: 'تم اعتماد توصية مراجعة الذكاء الاصطناعي',
    enSubject: 'AI review recommendation accepted',
    arTitle: 'تم اعتماد التوصية',
    enTitle: 'Recommendation accepted',
    arBody: 'تم اعتماد توصية المراجعة وتحديث حالة الدفعة.',
    enBody:
      'The review recommendation was accepted and payment status was updated.',
  },
  [NotificationType.CHANGE_REQUEST_CREATED]: {
    arSubject: 'تم إنشاء طلب تغيير',
    enSubject: 'Change request created',
    arTitle: 'طلب تغيير جديد',
    enTitle: 'New change request',
    arBody: 'تم إنشاء طلب تغيير جديد على الاتفاق.',
    enBody: 'A new change request was created for the agreement.',
  },
  [NotificationType.CHANGE_REQUEST_APPROVED]: {
    arSubject: 'تمت الموافقة على طلب التغيير',
    enSubject: 'Change request approved',
    arTitle: 'تم اعتماد طلب التغيير',
    enTitle: 'Change request approved',
    arBody: 'وافق العميل على طلب التغيير.',
    enBody: 'The client approved the change request.',
  },
  [NotificationType.PAYMENT_RESERVED]: {
    arSubject: 'تم حجز دفعة ضمان',
    enSubject: 'Dhaman payment reserved',
    arTitle: 'تم حجز الدفعة',
    enTitle: 'Payment reserved',
    arBody: 'تم حجز الدفعة التجريبية لهذه المرحلة.',
    enBody: 'The demo payment for this milestone has been reserved.',
  },
  [NotificationType.PAYMENT_READY_TO_RELEASE]: {
    arSubject: 'دفعة ضمان جاهزة للتحرير',
    enSubject: 'Dhaman payment ready to release',
    arTitle: 'الدفعة جاهزة للتحرير',
    enTitle: 'Payment ready to release',
    arBody: 'أصبحت الدفعة جاهزة للتحرير حسب حالة الاتفاق.',
    enBody: 'The payment is ready to release based on the agreement state.',
  },
  [NotificationType.PAYMENT_RELEASED]: {
    arSubject: 'تم تحرير دفعة ضمان',
    enSubject: 'Dhaman payment released',
    arTitle: 'تم تحرير الدفعة',
    enTitle: 'Payment released',
    arBody: 'تم تحرير الدفعة التجريبية بنجاح.',
    enBody: 'The demo payment was released successfully.',
  },
  [NotificationType.SYSTEM_TEST]: {
    arSubject: 'رسالة اختبار من ضمان',
    enSubject: 'Dhaman test notification',
    arTitle: 'اختبار البريد الإلكتروني',
    enTitle: 'Email test',
    arBody: 'هذه رسالة اختبار للتأكد من إعدادات البريد الإلكتروني.',
    enBody: 'This is a test message to verify email notification settings.',
  },
};

/**
 * Email Notifications Service
 *
 * Module responsibility:
 * - Prepare email previews and outbound notification orchestration.
 * Main entities touched:
 * - EmailNotification, Agreement.
 *
 * Business rules:
 * - Keep provider-specific logic behind a service boundary.
 * - Record send attempts and failures.
 * - Email send failures are non-blocking for internal callers.
 *
 * Implementation phases:
 * - Phase 2: DTOs and Swagger contracts (current).
 * - Phase 3: Service logic (template rendering, provider abstraction, send).
 * - Phase 4: Controller endpoint wiring.
 * - Phase 5: Tests and error cases.
 * - Final Phase: Frontend integration.
 */
@Injectable()
export class EmailNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clsService?: ClsService,
  ) {}

  preview(dto: PreviewEmailDto) {
    return this.previewEmail(dto);
  }

  sendTest(dto: SendTestNotificationDto) {
    return this.sendTestNotification(dto);
  }

  listLogs(query: EmailLogQueryDto) {
    return this.listEmailLogs(query);
  }

  async previewEmail(
    dto: PreviewEmailDto,
    userId = this.clsService?.get('userId'),
  ): Promise<EmailPreviewResponseDto> {
    const locale = this.resolveLocale(dto.locale);
    const context = await this.buildTemplateContext(
      dto.type,
      dto.agreementId,
      dto.metadata,
      userId,
    );
    const rendered = this.renderTemplate(dto.type, context, locale);

    return {
      type: dto.type,
      recipientEmail: context.recipientEmail,
      subject: rendered.subject,
      previewHtml: rendered.previewHtml,
      previewText: rendered.previewText,
      locale,
    };
  }

  async sendNotification(
    input: SendNotificationInput,
  ): Promise<EmailNotificationResponseDto> {
    try {
      if (!input.recipientEmail.trim()) {
        throw new AppException({ code: ErrorCode.EMAIL_RECIPIENT_REQUIRED });
      }

      if (this.requiresAgreement(input.type) && !input.agreementId) {
        throw new AppException({ code: ErrorCode.EMAIL_CONTEXT_INCOMPLETE });
      }

      const locale = this.resolveLocale(input.locale);
      const context = await this.buildTemplateContext(
        input.type,
        input.agreementId,
        input.metadata,
      );
      const rendered = this.renderTemplate(input.type, context, locale);
      const metadata = this.buildNotificationMetadata(input.metadata, locale);
      const pendingRecord = await this.prisma.emailNotification.create({
        data: {
          agreementId: input.agreementId ?? null,
          recipientEmail: input.recipientEmail,
          recipientName: input.recipientName ?? context.recipientName,
          type: input.type,
          subject: rendered.subject,
          status: NotificationStatus.PENDING,
          previewHtml: rendered.previewHtml,
          previewText: rendered.previewText,
          requestId: this.clsService?.get('requestId'),
          correlationId: this.clsService?.get('correlationId'),
          metadata,
        },
      });

      const providerResult = await this.sendWithProvider();
      const updatedRecord = await this.prisma.emailNotification.update({
        where: { id: pendingRecord.id },
        data: providerResult.ok
          ? {
              status: NotificationStatus.SENT,
              providerMessageId: providerResult.providerMessageId,
              sentAt: new Date(),
            }
          : {
              status: NotificationStatus.FAILED,
              errorMessage: providerResult.errorMessage,
            },
      });

      return this.toNotificationResponse(updatedRecord);
    } catch (error) {
      return this.createFailedNotification(input, error);
    }
  }

  async sendTestNotification(
    dto: SendTestNotificationDto,
    userId = this.clsService?.get('userId'),
  ): Promise<EmailNotificationResponseDto> {
    if (!dto.recipientEmail?.trim()) {
      throw new AppException({ code: ErrorCode.EMAIL_RECIPIENT_REQUIRED });
    }

    if (this.requiresAgreement(dto.type) && !dto.agreementId) {
      throw new AppException({ code: ErrorCode.EMAIL_CONTEXT_INCOMPLETE });
    }

    if (dto.agreementId) {
      await this.ensureAgreementContext(dto.agreementId, userId);
    }

    return this.sendNotification({
      agreementId: dto.agreementId,
      locale: dto.locale,
      metadata: { isTest: true, actorUserId: userId },
      recipientEmail: dto.recipientEmail,
      type: dto.type,
    });
  }

  // AR: يعيد إرسال دعوة الاتفاق للعميل بعد التحقق من الملكية والحالة.
  // EN: Resends the agreement invitation after verifying ownership and invitable status.
  async resendAgreementInvite(
    agreementId: string,
    userId = this.clsService?.get('userId'),
  ): Promise<EmailNotificationResponseDto> {
    const context = await this.ensureAgreementContext(agreementId, userId);

    if (
      !context.agreement ||
      !INVITABLE_STATUSES.has(context.agreement.status as AgreementStatus)
    ) {
      throw new AppException({
        code: ErrorCode.AGREEMENT_NOT_INVITABLE,
      });
    }

    if (!context.client.email.trim()) {
      throw new AppException({ code: ErrorCode.CLIENT_EMAIL_MISSING });
    }

    const notification = await this.sendNotification({
      agreementId,
      locale: this.resolveLocale(),
      metadata: { actorUserId: userId, resend: true },
      recipientEmail: context.client.email,
      recipientName: context.client.name,
      type: NotificationType.AGREEMENT_INVITE,
    });

    await this.createResendTimelineEvidence(agreementId, notification, userId);

    return notification;
  }

  async listEmailLogs(
    query: EmailLogQueryDto,
    userId = this.clsService?.get('userId'),
  ): Promise<PaginatedEmailNotificationsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.EmailNotificationWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.agreementId ? { agreementId: query.agreementId } : {}),
      ...(query.recipientEmail ? { recipientEmail: query.recipientEmail } : {}),
      ...this.buildDateFilter(query),
    };

    if (userId) {
      where.OR = [
        { agreement: { freelancerId: userId } },
        { metadata: { path: ['actorUserId'], equals: userId } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.emailNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.emailNotification.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toNotificationResponse(item)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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

    await this.sendNotification({
      agreementId: input.agreementId,
      recipientEmail: input.recipientEmail,
      type: NotificationType.AI_REVIEW_READY,
      metadata: {
        aiReviewId: input.aiReviewId,
        deliveryId: input.deliveryId,
        milestoneId: input.milestoneId,
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

    await this.sendNotification({
      agreementId: input.agreementId,
      recipientEmail: input.recipientEmail,
      type: NotificationType.AI_REVIEW_RECOMMENDATION_ACCEPTED,
      metadata: {
        paymentStatus: input.paymentStatus,
        recommendation: input.recommendation,
      },
    });
  }

  async buildTemplateContext(
    type: NotificationType,
    agreementId?: string,
    metadata: Record<string, unknown> = {},
    userId?: string,
  ): Promise<TemplateContext> {
    if (!TEMPLATE_REGISTRY[type]) {
      throw new AppException({ code: ErrorCode.EMAIL_TYPE_NOT_SUPPORTED });
    }

    if (!this.requiresAgreement(type)) {
      return {
        metadata,
        recipientEmail: null,
        recipientName: null,
      };
    }

    if (!agreementId) {
      throw new AppException({ code: ErrorCode.EMAIL_CONTEXT_INCOMPLETE });
    }

    return this.ensureAgreementContext(agreementId, userId, metadata);
  }

  renderTemplate(
    type: NotificationType,
    context: TemplateContext,
    locale: EmailLocale,
  ): RenderedEmail {
    const template = TEMPLATE_REGISTRY[type];

    if (!template) {
      throw new AppException({ code: ErrorCode.EMAIL_TEMPLATE_NOT_FOUND });
    }

    const isArabic = locale === Locale.AR;
    const subject = isArabic ? template.arSubject : template.enSubject;
    const title = isArabic ? template.arTitle : template.enTitle;
    const body = isArabic ? template.arBody : template.enBody;
    const agreementTitle =
      context.agreement?.title ?? (isArabic ? 'ضمان' : 'Dhaman');
    const recipientName =
      context.recipientName ?? (isArabic ? 'عميل ضمان' : 'Dhaman user');
    const direction = isArabic ? 'rtl' : 'ltr';
    const language = isArabic ? 'ar' : 'en';

    const previewText = [
      subject,
      title,
      body,
      agreementTitle,
      recipientName,
    ].join('\n');

    const previewHtml = [
      `<html lang="${language}" dir="${direction}">`,
      '<body>',
      `<h1>${this.escapeHtml(title)}</h1>`,
      `<p>${this.escapeHtml(body)}</p>`,
      `<p><strong>${this.escapeHtml(agreementTitle)}</strong></p>`,
      `<p>${this.escapeHtml(recipientName)}</p>`,
      '</body>',
      '</html>',
    ].join('');

    return { subject, previewHtml, previewText };
  }

  private async ensureAgreementContext(
    agreementId: string,
    userId?: string,
    metadata: Record<string, unknown> = {},
  ): Promise<
    TemplateContext & { client: NonNullable<TemplateContext['client']> }
  > {
    const agreement = await this.prisma.agreement.findFirst({
      where: {
        id: agreementId,
        ...(userId ? { freelancerId: userId } : {}),
      },
      select: {
        id: true,
        title: true,
        description: true,
        serviceType: true,
        totalAmount: true,
        currency: true,
        status: true,
        client: {
          select: {
            name: true,
            email: true,
            companyName: true,
          },
        },
        freelancer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!agreement) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }

    return {
      agreement: {
        id: agreement.id,
        title: agreement.title,
        description: agreement.description,
        serviceType: agreement.serviceType,
        totalAmount: agreement.totalAmount.toString(),
        currency: agreement.currency,
        status: agreement.status,
      },
      client: agreement.client,
      freelancer: agreement.freelancer,
      metadata,
      recipientEmail: agreement.client.email,
      recipientName: agreement.client.name,
    };
  }

  private async sendWithProvider(): Promise<
    | { ok: true; providerMessageId: string }
    | { ok: false; errorMessage: string }
  > {
    if (!process.env.RESEND_API_KEY) {
      return {
        ok: false,
        errorMessage: 'Email provider is not configured; preview stored.',
      };
    }

    return {
      ok: true,
      providerMessageId: `demo_${Date.now()}`,
    };
  }

  private async createFailedNotification(
    input: SendNotificationInput,
    error: unknown,
  ): Promise<EmailNotificationResponseDto> {
    const locale = this.resolveLocale(input.locale);
    const safeError = this.sanitizeError(error);
    const fallbackTemplate =
      TEMPLATE_REGISTRY[input.type] ?? TEMPLATE_REGISTRY.SYSTEM_TEST;
    const record = await this.prisma.emailNotification.create({
      data: {
        agreementId: input.agreementId ?? null,
        recipientEmail: input.recipientEmail,
        recipientName: input.recipientName ?? null,
        type: input.type,
        subject:
          locale === Locale.AR
            ? fallbackTemplate.arSubject
            : fallbackTemplate.enSubject,
        status: NotificationStatus.FAILED,
        errorMessage: safeError,
        requestId: this.clsService?.get('requestId'),
        correlationId: this.clsService?.get('correlationId'),
        metadata: this.buildNotificationMetadata(input.metadata, locale),
      },
    });

    return this.toNotificationResponse(record);
  }

  // AR: ينشئ سجل إشعار معلق لإبلاغ العميل بأن التسليم تم إرساله للمراجعة.
  // EN: Creates a pending notification record to inform the client that a delivery was submitted for review.
  async enqueueDeliverySubmittedForClient(input: {
    agreementId: string;
    deliveryId: string;
    milestoneId: string;
    milestoneTitle: string;
  }): Promise<void> {
    await this.prisma.emailNotification.create({
      data: {
        agreementId: input.agreementId,
        recipientEmail: '',
        type: NotificationType.DELIVERY_SUBMITTED,
        subject: `Delivery submitted for "${input.milestoneTitle}"`,
        status: NotificationStatus.PENDING,
      },
    });
  }

  // AR: ينشئ سجل إشعار معلق لإبلاغ المستقل بأن العميل طلب تعديلات على التسليم.
  // EN: Creates a pending notification record to inform the freelancer that changes were requested.
  async enqueueDeliveryChangesRequestedForFreelancer(input: {
    agreementId: string;
    deliveryId: string;
    milestoneId: string;
    milestoneTitle: string;
    reason: string;
  }): Promise<void> {
    await this.prisma.emailNotification.create({
      data: {
        agreementId: input.agreementId,
        recipientEmail: '',
        type: NotificationType.DELIVERY_CHANGES_REQUESTED,
        subject: `Changes requested for "${input.milestoneTitle}"`,
        status: NotificationStatus.PENDING,
      },
    });
  }

  private placeholder(action: string, details?: Record<string, unknown>) {
  private async createResendTimelineEvidence(
    agreementId: string,
    notification: EmailNotificationResponseDto,
    userId?: string,
  ): Promise<void> {
    await this.prisma.timelineEvent.create({
      data: {
        agreementId,
        actorId: userId ?? null,
        actorRole: userId
          ? TimelineActorRole.FREELANCER
          : TimelineActorRole.SYSTEM,
        type: TimelineEventType.EMAIL_SENT,
        title: 'Agreement invite resent',
        description: `Agreement invite resent to ${notification.recipientEmail}.`,
        metadata: {
          notificationId: notification.id,
          recipientEmail: notification.recipientEmail,
          status: notification.status,
        },
      },
    });
  }

  private buildDateFilter(
    query: EmailLogQueryDto,
  ): Pick<Prisma.EmailNotificationWhereInput, 'createdAt'> {
    if (!query.from && !query.to) {
      return {};
    }

    return {
      createdAt: {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      },
    };
  }

  private buildNotificationMetadata(
    metadata: Record<string, unknown> = {},
    locale: EmailLocale,
  ): Prisma.InputJsonObject {
    return {
      ...metadata,
      actorType: this.clsService?.get('actorType'),
      actorUserId: metadata.actorUserId ?? this.clsService?.get('userId'),
      agreementId: metadata.agreementId ?? this.clsService?.get('agreementId'),
      correlationId: this.clsService?.get('correlationId'),
      locale,
      portalTokenId: this.clsService?.get('portalTokenId'),
      requestId: this.clsService?.get('requestId'),
      userRole: this.clsService?.get('userRole'),
    } as Prisma.InputJsonObject;
  }

  private requiresAgreement(type: NotificationType): boolean {
    return AGREEMENT_SCOPED_TYPES.has(type);
  }

  private resolveLocale(locale?: EmailLocale): EmailLocale {
    const contextLocale = this.clsService?.get('locale');

    if (locale === Locale.AR || locale === Locale.EN) {
      return locale;
    }

    if (contextLocale === Locale.AR || contextLocale === Locale.EN) {
      return contextLocale;
    }

    return Locale.AR;
  }

  private sanitizeError(error: unknown): string {
    if (error instanceof AppException) {
      return error.code;
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message.slice(0, 300);
    }

    return ErrorCode.EMAIL_SEND_FAILED;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private toNotificationResponse(record: {
    id: string;
    agreementId: string | null;
    recipientEmail: string;
    type: NotificationType;
    subject: string;
    status: NotificationStatus;
    providerMessageId: string | null;
    errorMessage: string | null;
    previewHtml: string | null;
    sentAt: Date | null;
    createdAt: Date;
  }): EmailNotificationResponseDto {
    return {
      id: record.id,
      agreementId: record.agreementId,
      recipientEmail: record.recipientEmail,
      type: record.type,
      subject: record.subject,
      status: record.status,
      providerMessageId: record.providerMessageId,
      errorMessage: record.errorMessage,
      previewHtml: record.previewHtml,
      sentAt: record.sentAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
