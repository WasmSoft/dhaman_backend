import {
  AgreementStatus,
  NotificationStatus,
  NotificationType,
  Prisma,
  TimelineActorRole,
  TimelineEventType,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
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
    description: string | null;
    serviceType: string | null;
    totalAmount: string;
    currency: string;
    status: string;
    inviteToken?: string | null;
    portalToken?: string | null;
  };
  client?: {
    name: string;
    email: string;
    companyName: string | null;
  };
  freelancer?: {
    name: string | null;
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
  NotificationType.AGREEMENT_ACTIVATED,
  NotificationType.AGREEMENT_CANCELLED,
  NotificationType.DELIVERY_SUBMITTED,
  NotificationType.DELIVERY_CHANGES_REQUESTED,
  NotificationType.AI_REVIEW_READY,
  NotificationType.AI_REVIEW_RECOMMENDATION_ACCEPTED,
  NotificationType.CHANGE_REQUEST_CREATED,
  NotificationType.CHANGE_REQUEST_APPROVED,
  NotificationType.CHANGE_REQUEST_DECLINED,
  NotificationType.PAYMENT_RESERVED,
  NotificationType.PAYMENT_READY_TO_RELEASE,
  NotificationType.PAYMENT_RELEASED,
]);

// AR: سجل قوالب البريد الإلكتروني لجميع أنواع الإشعارات.
// EN: Email template registry for all notification types.
const TEMPLATE_REGISTRY: Record<NotificationType, TemplateDefinition> = {
  [NotificationType.AGREEMENT_INVITE]: {
    arSubject: 'دعوة لمراجعة واعتماد الاتفاق',
    enSubject: 'Invitation to review and approve the agreement',
    arTitle: 'دعوة اتفاق جديدة',
    enTitle: 'New Agreement Invitation',
    arBody:
      'تم إنشاء اتفاق جديد وأنت مدعو لمراجعة التفاصيل والموافقة أو طلب التعديل. يرجى النقر على الزر أدناه للوصول إلى بوابة العميل.',
    enBody:
      'A new agreement has been created. You are invited to review the details and approve or request changes. Please click the button below to access the client portal.',
  },
  [NotificationType.AGREEMENT_APPROVED]: {
    arSubject: 'تمت الموافقة على الاتفاق',
    enSubject: 'Agreement approved',
    arTitle: 'تمت الموافقة على الاتفاق',
    enTitle: 'Agreement Approved',
    arBody: 'وافق العميل على الاتفاق ويمكنك البدء في تنفيذ العمل.',
    enBody: 'The client approved the agreement and work can now proceed.',
  },
  [NotificationType.AGREEMENT_CHANGE_REQUESTED]: {
    arSubject: 'طلب تعديل على الاتفاق',
    enSubject: 'Agreement change requested',
    arTitle: 'طلب العميل تعديلاً',
    enTitle: 'Client Requested Changes',
    arBody: 'راجع ملاحظات العميل وعدّل الاتفاق عند الحاجة.',
    enBody: 'Review the client notes and update the agreement if needed.',
  },
  [NotificationType.AGREEMENT_ACTIVATED]: {
    arSubject: 'تم تفعيل الاتفاق — المشروع جاهز للمتابعة',
    enSubject: 'Agreement activated — project is now active',
    arTitle: 'تم تفعيل الاتفاق',
    enTitle: 'Agreement Activated',
    arBody:
      'تم تفعيل الاتفاق وبدأ العمل بشكل رسمي. يمكنك متابعة تقدم المشروع من خلال بوابة العميل.',
    enBody:
      'The agreement has been activated and work has officially started. You can track project progress through the client portal.',
  },
  [NotificationType.AGREEMENT_CANCELLED]: {
    arSubject: 'تم إلغاء الاتفاق',
    enSubject: 'Agreement cancelled',
    arTitle: 'تم إلغاء الاتفاق',
    enTitle: 'Agreement Cancelled',
    arBody: 'تم إلغاء الاتفاق وإيقاف العمل غير المكتمل.',
    enBody: 'The agreement was cancelled and unfinished work was stopped.',
  },
  [NotificationType.DELIVERY_SUBMITTED]: {
    arSubject: 'تسليمة جديدة جاهزة للمراجعة',
    enSubject: 'New delivery ready for review',
    arTitle: 'تسليم جديد بانتظار موافقتك',
    enTitle: 'New Delivery Awaiting Your Review',
    arBody:
      'تم تجهيز تسليم جديد لمراجعتك. يرجى فتح بوابة العميل لمراجعة التسليم واتخاذ الإجراء المناسب: القبول أو طلب التعديلات.',
    enBody:
      'A new delivery has been prepared for your review. Please open the client portal to review the delivery and take appropriate action: accept or request changes.',
  },
  [NotificationType.DELIVERY_CHANGES_REQUESTED]: {
    arSubject: 'طلب تعديلات على التسليم',
    enSubject: 'Delivery changes requested',
    arTitle: 'تعديلات مطلوبة',
    enTitle: 'Changes Requested',
    arBody: 'طلب العميل تعديلات على التسليم. راجع الملاحظات وأعد الإرسال.',
    enBody: 'The client requested changes to the delivery. Review the notes and resubmit.',
  },
  [NotificationType.AI_REVIEW_READY]: {
    arSubject: 'نتيجة مراجعة الذكاء الاصطناعي جاهزة',
    enSubject: 'AI review result is ready',
    arTitle: 'مراجعة الذكاء الاصطناعي جاهزة',
    enTitle: 'AI Review Ready',
    arBody: 'أصبحت نتيجة المراجعة متاحة. يمكنك الاطلاع عليها داخل منصة ضمان.',
    enBody: 'The review result is now available inside Dhaman.',
  },
  [NotificationType.AI_REVIEW_RECOMMENDATION_ACCEPTED]: {
    arSubject: 'تم اعتماد توصية مراجعة الذكاء الاصطناعي',
    enSubject: 'AI review recommendation accepted',
    arTitle: 'تم اعتماد التوصية',
    enTitle: 'Recommendation Accepted',
    arBody: 'تم اعتماد توصية المراجعة وتحديث حالة الدفعة.',
    enBody: 'The review recommendation was accepted and payment status was updated.',
  },
  [NotificationType.CHANGE_REQUEST_CREATED]: {
    arSubject: 'تم إنشاء طلب تغيير',
    enSubject: 'Change request created',
    arTitle: 'طلب تغيير جديد',
    enTitle: 'New Change Request',
    arBody: 'تم إنشاء طلب تغيير جديد على الاتفاق.',
    enBody: 'A new change request was created for the agreement.',
  },
  [NotificationType.CHANGE_REQUEST_APPROVED]: {
    arSubject: 'تمت الموافقة على طلب التغيير',
    enSubject: 'Change request approved',
    arTitle: 'تم اعتماد طلب التغيير',
    enTitle: 'Change Request Approved',
    arBody: 'وافق العميل على طلب التغيير.',
    enBody: 'The client approved the change request.',
  },
  [NotificationType.CHANGE_REQUEST_DECLINED]: {
    arSubject: 'تم رفض طلب التغيير',
    enSubject: 'Change request declined',
    arTitle: 'تم رفض طلب التغيير',
    enTitle: 'Change Request Declined',
    arBody: 'رفض العميل طلب التغيير.',
    enBody: 'The client declined the change request.',
  },
  [NotificationType.PAYMENT_RESERVED]: {
    arSubject: 'تم حجز الدفعة',
    enSubject: 'Payment reserved',
    arTitle: 'تم حجز الدفعة',
    enTitle: 'Payment Reserved',
    arBody: 'تم حجز الدفعة لهذه المرحلة بنجاح في الوضع التجريبي.',
    enBody: 'The payment for this milestone has been successfully reserved in demo mode.',
  },
  [NotificationType.PAYMENT_READY_TO_RELEASE]: {
    arSubject: 'الدفعة جاهزة للتحرير',
    enSubject: 'Payment ready to release',
    arTitle: 'الدفعة جاهزة للتحرير',
    enTitle: 'Payment Ready to Release',
    arBody: 'أصبحت الدفعة جاهزة للتحرير.',
    enBody: 'The payment is now ready to be released.',
  },
  [NotificationType.PAYMENT_RELEASED]: {
    arSubject: 'تم تحرير الدفعة',
    enSubject: 'Payment released',
    arTitle: 'تم تحرير الدفعة',
    enTitle: 'Payment Released',
    arBody: 'تم تحرير الدفعة بنجاح.',
    enBody: 'The payment was released successfully.',
  },
  [NotificationType.SYSTEM_TEST]: {
    arSubject: 'رسالة اختبار من منصة ضمان',
    enSubject: 'Dhaman platform test notification',
    arTitle: 'اختبار البريد الإلكتروني',
    enTitle: 'Email Test',
    arBody: 'هذه رسالة اختبار للتأكد من إعدادات البريد الإلكتروني.',
    enBody: 'This is a test message to verify email notification settings.',
  },
};

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

  // AR: ترسل إشعاراً بريدياً كاملاً للمستلم بعد تخزين السجل وإرساله عبر Resend.
  // EN: Sends a full email notification after storing the record and dispatching via Resend.
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

      // AR: إرسال البريد الإلكتروني الفعلي عبر مزود Resend.
      // EN: Dispatch the actual email via the Resend provider.
      const providerResult = await this.sendWithProvider(
        input.recipientEmail,
        rendered.subject,
        rendered.previewHtml,
      );

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

  // AR: يعيد إرسال دعوة الاتفاق مع رابط البوابة الصحيح ويسجل الحدث في الخط الزمني.
  // EN: Resends the agreement invite with the correct portal link and logs the timeline event.
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
      metadata: {
        actorUserId: userId,
        resend: true,
        inviteToken: context.agreement.inviteToken,
      },
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

  // AR: يرسل إشعار تسليم جديد للعميل بعد البحث عن بريده الإلكتروني ورمز البوابة.
  // EN: Sends a new delivery notification to the client after looking up their email and portal token.
  async enqueueDeliverySubmittedForClient(input: {
    agreementId: string;
    deliveryId: string;
    milestoneId: string;
    milestoneTitle: string;
  }): Promise<void> {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: input.agreementId },
      select: {
        portalToken: true,
        client: { select: { email: true, name: true } },
      },
    });

    if (!agreement?.client?.email?.trim()) {
      return;
    }

    await this.sendNotification({
      agreementId: input.agreementId,
      recipientEmail: agreement.client.email,
      recipientName: agreement.client.name,
      type: NotificationType.DELIVERY_SUBMITTED,
      metadata: {
        deliveryId: input.deliveryId,
        milestoneId: input.milestoneId,
        milestoneTitle: input.milestoneTitle,
        portalToken: agreement.portalToken,
      },
    });
  }

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
        metadata: {
          deliveryId: input.deliveryId,
          milestoneId: input.milestoneId,
          reason: input.reason,
        },
      },
    });
  }

  async enqueueChangeRequestSentForClient(input: {
    agreementId: string;
    changeRequestId: string;
    title: string;
  }): Promise<void> {
    await this.prisma.emailNotification.create({
      data: {
        agreementId: input.agreementId,
        recipientEmail: '',
        type: NotificationType.CHANGE_REQUEST_CREATED,
        subject: `Change request sent: "${input.title}"`,
        status: NotificationStatus.PENDING,
        metadata: {
          changeRequestId: input.changeRequestId,
        },
      },
    });
  }

  async enqueueChangeRequestApprovedForFreelancer(input: {
    agreementId: string;
    changeRequestId: string;
    title: string;
  }): Promise<void> {
    await this.prisma.emailNotification.create({
      data: {
        agreementId: input.agreementId,
        recipientEmail: '',
        type: NotificationType.CHANGE_REQUEST_APPROVED,
        subject: `Change request approved: "${input.title}"`,
        status: NotificationStatus.PENDING,
        metadata: {
          changeRequestId: input.changeRequestId,
        },
      },
    });
  }

  async enqueueChangeRequestDeclinedForFreelancer(input: {
    agreementId: string;
    changeRequestId: string;
    title: string;
  }): Promise<void> {
    await this.prisma.emailNotification.create({
      data: {
        agreementId: input.agreementId,
        recipientEmail: '',
        type: NotificationType.CHANGE_REQUEST_DECLINED,
        subject: `Change request declined: "${input.title}"`,
        status: NotificationStatus.PENDING,
        metadata: {
          changeRequestId: input.changeRequestId,
        },
      },
    });
  }

  // AR: يرسل إشعار تفعيل الاتفاق للعميل مع رابط التتبع.
  // EN: Sends an agreement activation notification to the client with the tracking link.
  async enqueueAgreementActivatedForClient(input: {
    agreementId: string;
    recipientEmail: string;
    agreementTitle: string;
  }): Promise<void> {
    if (!input.recipientEmail.trim()) {
      throw new AppException({ code: ErrorCode.EMAIL_RECIPIENT_REQUIRED });
    }

    const agreement = await this.prisma.agreement.findUnique({
      where: { id: input.agreementId },
      select: {
        portalToken: true,
        client: { select: { name: true } },
      },
    });

    await this.sendNotification({
      agreementId: input.agreementId,
      recipientEmail: input.recipientEmail,
      recipientName: agreement?.client?.name ?? undefined,
      type: NotificationType.AGREEMENT_ACTIVATED,
      metadata: {
        portalToken: agreement?.portalToken,
        agreementTitle: input.agreementTitle,
      },
    });
  }

  // AR: يرسل إشعار إلغاء الاتفاق للعميل.
  // EN: Sends an agreement cancellation notification to the client.
  async enqueueAgreementCancelledForClient(input: {
    agreementId: string;
    recipientEmail: string;
    agreementTitle: string;
  }): Promise<void> {
    if (!input.recipientEmail.trim()) {
      throw new AppException({ code: ErrorCode.EMAIL_RECIPIENT_REQUIRED });
    }

    await this.sendNotification({
      agreementId: input.agreementId,
      recipientEmail: input.recipientEmail,
      type: NotificationType.AGREEMENT_CANCELLED,
      metadata: {
        agreementTitle: input.agreementTitle,
      },
    });
  }

  // AR: يحجز سجل الدعوة ثم يرسل البريد الإلكتروني الفعلي عبر Resend.
  // EN: Queues the invite record and dispatches the actual email via Resend.
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

    await this.sendNotification({
      agreementId: input.agreementId,
      recipientEmail: input.recipientEmail,
      recipientName: input.clientName,
      type: NotificationType.AGREEMENT_INVITE,
      metadata: {
        inviteToken: input.inviteToken,
        agreementTitle: input.agreementTitle,
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

  // AR: يبني قالب HTML كاملاً للبريد الإلكتروني مع رابط CTA وتنسيق عربي.
  // EN: Builds a full HTML email template with CTA link and Arabic formatting.
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

    // AR: يبني رابط البوابة المناسب بناءً على نوع الإشعار.
    // EN: Builds the appropriate portal link based on the notification type.
    const ctaInfo = this.buildPortalLink(type, context);

    const previewText = [subject, title, body, agreementTitle, recipientName].join('\n');
    const previewHtml = this.buildEmailHtml({
      title,
      body,
      agreementTitle,
      recipientName,
      ctaLabel: ctaInfo ? (isArabic ? ctaInfo.arLabel : ctaInfo.enLabel) : '',
      ctaUrl: ctaInfo?.url ?? null,
      direction,
      language,
    });

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
        inviteToken: true,
        portalToken: true,
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

    if (!agreement.client) {
      throw new AppException({ code: ErrorCode.EMAIL_CONTEXT_INCOMPLETE });
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
        inviteToken: agreement.inviteToken,
        portalToken: agreement.portalToken,
      },
      client: agreement.client,
      freelancer: agreement.freelancer,
      metadata,
      recipientEmail: agreement.client.email,
      recipientName: agreement.client.name,
    };
  }

  // AR: يرسل البريد الإلكتروني عبر Resend ويعيد معرف الرسالة أو رسالة الخطأ.
  // EN: Sends the email via Resend and returns the message ID or error message.
  private async sendWithProvider(
    to: string,
    subject: string,
    html: string,
  ): Promise<{ ok: true; providerMessageId: string } | { ok: false; errorMessage: string }> {
    const apiKey = process.env.RESEND_API_KEY;
    const from =
      process.env.EMAIL_FROM ?? 'no-reply@notify.dhaman.wasmsoft.com';

    if (!apiKey) {
      return {
        ok: false,
        errorMessage: 'RESEND_API_KEY is not configured; email preview stored.',
      };
    }

    try {
      const resend = new Resend(apiKey);
      const { data, error } = await resend.emails.send({
        from: `Dhaman Platform <${from}>`,
        to,
        subject,
        html,
      });

      if (error || !data?.id) {
        const msg = error?.message ?? 'Unknown Resend provider error.';
        console.error('[EmailNotificationsService] Resend error:', msg);
        return { ok: false, errorMessage: msg.slice(0, 300) };
      }

      return { ok: true, providerMessageId: data.id };
    } catch (err) {
      const message =
        err instanceof Error ? err.message.slice(0, 300) : 'Email send failed.';
      console.error('[EmailNotificationsService] sendWithProvider threw:', message);
      return { ok: false, errorMessage: message };
    }
  }

  // AR: يبني رابط البوابة المناسب ونص الزر بناءً على نوع الإشعار والسياق.
  // EN: Builds the appropriate portal link and button text based on notification type and context.
  private buildPortalLink(
    type: NotificationType,
    context: TemplateContext,
  ): { url: string; arLabel: string; enLabel: string } | null {
    const frontendUrl =
      process.env.FRONTEND_URL ?? 'http://localhost:3000';

    // Agreement invite: send client to their portal home page using the portalToken.
    if (type === NotificationType.AGREEMENT_INVITE) {
      const token =
        context.metadata?.portalToken ?? context.agreement?.portalToken;
      if (typeof token === 'string' && token.trim()) {
        return {
          url: `${frontendUrl}/portal/${token}`,
          arLabel: 'فتح بوابة العميل',
          enLabel: 'Open client portal',
        };
      }
    }

    // Delivery submitted: use portalToken from metadata and deliveryId from metadata
    if (type === NotificationType.DELIVERY_SUBMITTED) {
      const token =
        context.metadata?.portalToken ?? context.agreement?.portalToken;
      const deliveryId = context.metadata?.deliveryId;
      if (
        typeof token === 'string' &&
        token.trim() &&
        typeof deliveryId === 'string' &&
        deliveryId.trim()
      ) {
        return {
          url: `${frontendUrl}/portal/${token}/deliveries/${deliveryId}`,
          arLabel: 'مراجعة التسليم واتخاذ القرار',
          enLabel: 'Review the delivery',
        };
      }
    }

    // Tracking link for activation, payment events, etc.
    if (
      type === NotificationType.AGREEMENT_ACTIVATED ||
      type === NotificationType.PAYMENT_RESERVED ||
      type === NotificationType.PAYMENT_RELEASED ||
      type === NotificationType.PAYMENT_READY_TO_RELEASE
    ) {
      const token =
        context.metadata?.portalToken ?? context.agreement?.portalToken;
      if (typeof token === 'string' && token.trim()) {
        return {
          url: `${frontendUrl}/portal/${token}/tracking`,
          arLabel: 'متابعة تقدم المشروع',
          enLabel: 'Track project progress',
        };
      }
    }

    return null;
  }

  // AR: يبني قالب HTML للبريد الإلكتروني مع تصميم احترافي وزر CTA.
  // EN: Builds the HTML email template with a professional design and CTA button.
  private buildEmailHtml(params: {
    title: string;
    body: string;
    agreementTitle: string;
    recipientName: string;
    ctaLabel: string;
    ctaUrl: string | null;
    direction: 'rtl' | 'ltr';
    language: 'ar' | 'en';
  }): string {
    const { title, body, agreementTitle, recipientName, ctaLabel, ctaUrl, direction, language } =
      params;
    const align = direction === 'rtl' ? 'right' : 'left';
    const greeting = language === 'ar' ? 'مرحباً' : 'Hello';
    const agreementLabel = language === 'ar' ? 'الاتفاق' : 'Agreement';
    const footerNote =
      language === 'ar'
        ? 'منصة ضمان — إشعار تلقائي، لا تقم بالرد على هذا البريد.'
        : 'Dhaman Platform — Automated notification, please do not reply.';

    const ctaBlock =
      ctaUrl && ctaLabel
        ? `<div style="text-align:center;margin:28px 0;">
            <a href="${this.escapeHtml(ctaUrl)}"
               style="background:#6f52ff;color:#ffffff;text-decoration:none;
                      border-radius:10px;padding:14px 32px;font-size:15px;
                      font-weight:700;display:inline-block;letter-spacing:0.3px;">
              ${this.escapeHtml(ctaLabel)}
            </a>
          </div>
          <p style="text-align:center;margin:8px 0 0;font-size:11px;color:#737b99;word-break:break-all;">
            ${this.escapeHtml(ctaUrl)}
          </p>`
        : '';

    return `<!DOCTYPE html>
<html lang="${language}" dir="${direction}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${this.escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:20px 0;background:#0d0f1a;font-family:Arial,Helvetica,sans-serif;color:#c6cbe0;direction:${direction};">
  <div style="max-width:600px;margin:0 auto;background:#13182b;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a1440 0%,#13182b 100%);padding:28px 32px;text-align:${align};">
      <p style="margin:0;font-size:12px;color:#8f97b6;font-weight:600;letter-spacing:1px;text-transform:uppercase;">
        منصة ضمان &nbsp;|&nbsp; Dhaman Platform
      </p>
      <h1 style="margin:10px 0 0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.3;">
        ${this.escapeHtml(title)}
      </h1>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;text-align:${align};">
      <p style="margin:0 0 16px;font-size:14px;color:#a9b0cd;">
        ${this.escapeHtml(greeting)}, <strong style="color:#ffffff;">${this.escapeHtml(recipientName)}</strong>
      </p>

      <!-- Agreement card -->
      <div style="background:rgba(111,82,255,0.1);border:1px solid rgba(111,82,255,0.25);border-radius:12px;padding:16px 20px;margin:0 0 20px;">
        <p style="margin:0;font-size:11px;color:#8f97b6;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">
          ${this.escapeHtml(agreementLabel)}
        </p>
        <p style="margin:6px 0 0;font-size:16px;font-weight:700;color:#ffffff;">
          ${this.escapeHtml(agreementTitle)}
        </p>
      </div>

      <!-- Main message -->
      <p style="margin:0 0 24px;font-size:14px;line-height:1.8;color:#c6cbe0;">
        ${this.escapeHtml(body)}
      </p>

      <!-- CTA button -->
      ${ctaBlock}
    </div>

    <!-- Footer -->
    <div style="padding:18px 32px;border-top:1px solid rgba(255,255,255,0.07);text-align:center;">
      <p style="margin:0;font-size:11px;color:#737b99;">${this.escapeHtml(footerNote)}</p>
    </div>

  </div>
</body>
</html>`;
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
    };
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
