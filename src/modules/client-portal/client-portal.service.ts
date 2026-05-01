import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import {
  AgreementStatus,
  NotificationType,
  TimelineActorRole,
  TimelineEventType,
  type Prisma,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/errors/app-exception';
import { ClsService } from '../../common/cls/cls.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { DeliveriesService } from '../deliveries/deliveries.service';
import { TimelineEventsService } from '../timeline-events/timeline-events.service';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import {
  PortalRequestChangesDto,
  PortalRejectAgreementDto,
} from './dto/portal-request.dto';
import { PortalFundPaymentDto } from '../payments/dto/payments.dto';
import { PortalReleaseConfirmationDto } from '../payments/dto/payments.dto';

const APPROVABLE_STATUSES = new Set<AgreementStatus>([
  AgreementStatus.SENT,
  AgreementStatus.CHANGE_REQUESTED,
]);

const CHANGEABLE_STATUSES = new Set<AgreementStatus>([AgreementStatus.SENT]);

const REJECTABLE_STATUSES = new Set<AgreementStatus>([AgreementStatus.SENT]);

const RAW_TOKEN_BYTES = 32;
const TOKEN_PREVIEW_LENGTH = 8;

/**
 * Module responsibility:
 * - Expose secure token-based client actions without full account auth.
 * Main entities touched:
 * - PortalToken, Agreement, Payment, Delivery, TimelineEvent, EmailNotification.
 * Business rules:
 * - Validate token scope via CLS context (set by PortalTokenGuard).
 * - Limit all operations to the agreement bound to the portal token.
 * - Delegate payment and delivery state machines to owning modules.
 * - Keep timeline and email side effects non-blocking.
 */
@Injectable()
export class ClientPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clsService: ClsService,
    private readonly paymentsService: PaymentsService,
    private readonly deliveriesService: DeliveriesService,
    private readonly timelineEventsService: TimelineEventsService,
    private readonly emailService: EmailNotificationsService,
  ) {}

  // ──────────────────────────────────────────────────────────
  //  Token Creation (called by Agreements module when sending invites)
  // ──────────────────────────────────────────────────────────

  // AR: ينشئ رمز بوابة آمن لاتفاق معين ويعيد الرمز الخام مرة واحدة فقط.
  // EN: Generates a secure portal token for an agreement and returns the raw token only once.
  async createPortalToken(
    agreementId: string,
    type: string,
    options?: { expiresAt?: Date },
  ): Promise<{ rawToken: string; tokenId: string }> {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      select: { id: true },
    });

    if (!agreement) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }

    const rawToken = randomBytes(RAW_TOKEN_BYTES).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const tokenPreview = rawToken.substring(0, TOKEN_PREVIEW_LENGTH);

    try {
      const portalToken = await this.prisma.portalToken.create({
        data: {
          agreementId,
          tokenHash,
          tokenPreview,
          type: type as any,
          expiresAt: options?.expiresAt ?? null,
        },
        select: { id: true },
      });

      return { rawToken, tokenId: portalToken.id };
    } catch (error) {
      throw new AppException({
        code: ErrorCode.PORTAL_TOKEN_CREATE_FAILED,
        details: { originalError: String(error) },
      });
    }
  }

  // AR: يتحقق من سياق البوابة المُعيّن بواسطة الحارس ويعيد معرف الاتفاق.
  // EN: Reads the portal context set by the guard and returns the agreement ID.
  private getPortalContext(): { agreementId: string; portalTokenId: string } {
    const ctx = this.clsService.getContext();
    if (!ctx?.agreementId || !ctx?.portalTokenId) {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    }
    return { agreementId: ctx.agreementId, portalTokenId: ctx.portalTokenId };
  }

  // ──────────────────────────────────────────────────────────
  //  Invite
  // ──────────────────────────────────────────────────────────

  // AR: يعيد ملخص دعوة الاتفاق للعميل بناءً على سياق الرمز.
  // EN: Returns the agreement invitation summary scoped to the token agreement.
  async getInvite(_token: string) {
    const { agreementId } = this.getPortalContext();

    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      include: {
        freelancer: { select: { name: true } },
        client: { select: { name: true, email: true } },
        policy: {
          select: {
            clientReviewPeriodDays: true,
            freelancerDelayGraceDays: true,
          },
        },
        milestones: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            order: true,
            title: true,
            description: true,
            amount: true,
            currency: true,
            status: true,
            dueDate: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            milestoneId: true,
            amount: true,
            currency: true,
            status: true,
          },
        },
      },
    });

    if (!agreement) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }

    const milestoneTitleMap = new Map<string, string>();
    for (const m of agreement.milestones) {
      milestoneTitleMap.set(m.id, m.title);
    }

    return {
      agreementId: agreement.id,
      title: agreement.title,
      description: agreement.description,
      serviceType: agreement.serviceType,
      totalAmount: String(agreement.totalAmount),
      currency: agreement.currency,
      expectedDeliveryDate:
        agreement.expectedDeliveryDate?.toISOString() ?? undefined,
      status: agreement.status,
      sentAt: agreement.sentAt?.toISOString() ?? undefined,
      freelancer: { name: agreement.freelancer.name },
      client: {
        name: agreement.client?.name ?? '',
        email: agreement.client?.email ?? undefined,
      },
      policy: agreement.policy
        ? {
            reviewPeriodDays: agreement.policy.clientReviewPeriodDays,
            revisionLimit: agreement.policy.freelancerDelayGraceDays,
          }
        : undefined,
      milestones: agreement.milestones.map((m) => ({
        id: m.id,
        order: m.order,
        title: m.title,
        description: m.description ?? undefined,
        amount: String(m.amount),
        currency: m.currency,
        status: m.status,
        dueDate: m.dueDate?.toISOString() ?? undefined,
      })),
      paymentSchedule: agreement.payments.map((p) => ({
        milestoneId: p.milestoneId ?? '',
        milestoneTitle: milestoneTitleMap.get(p.milestoneId ?? '') ?? '',
        amount: String(p.amount),
        currency: p.currency,
        status: p.status,
      })),
    };
  }

  // ──────────────────────────────────────────────────────────
  //  Agreement Actions
  // ──────────────────────────────────────────────────────────

  // AR: يوافق العميل على اتفاق عبر البوابة وينشئ حدث سجل زمني وبريد إلكتروني.
  // EN: Approves an agreement from the client portal, creates timeline event and notification.
  async approve(_token: string) {
    const { agreementId, portalTokenId } = this.getPortalContext();

    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      select: {
        id: true,
        title: true,
        status: true,
        freelancerId: true,
        freelancer: { select: { email: true, name: true } },
        client: { select: { email: true, name: true } },
      },
    });

    if (!agreement) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }

    if (!APPROVABLE_STATUSES.has(agreement.status)) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_APPROVABLE });
    }

    const now = new Date();

    const updatedAgreement = await this.prisma.$transaction(async (tx) => {
      const result = await tx.agreement.update({
        where: { id: agreementId },
        data: {
          status: AgreementStatus.APPROVED,
          approvedAt: now,
        },
      });

      // Timeline event - non-blocking if it fails
      try {
        await this.timelineEventsService.createEvent(
          {
            actorId: portalTokenId,
            actorRole: TimelineActorRole.CLIENT,
            agreementId,
            type: TimelineEventType.AGREEMENT_APPROVED,
            title: 'Agreement Approved',
            description: `Client approved agreement "${agreement.title}" via portal.`,
            metadata: { previousStatus: agreement.status },
          },
          tx,
        );
      } catch (e) {
        // Timeline failure is logged and non-blocking per spec
      }

      return result;
    });

    // Email notification - non-blocking
    try {
      if (agreement.freelancer.email) {
        await this.emailService.sendNotification({
          agreementId,
          locale: 'ar',
          metadata: { actorRole: 'CLIENT', portalTokenId },
          recipientEmail: agreement.freelancer.email,
          recipientName: agreement.freelancer.name,
          type: NotificationType.AGREEMENT_APPROVED,
        });
      }
    } catch {
      // Email failure is non-blocking per spec
    }

    return {
      agreementId,
      status: updatedAgreement.status,
      message: 'Agreement approved successfully.',
    };
  }

  // AR: يطلب العميل تعديلات على الاتفاق قبل الموافقة عبر البوابة.
  // EN: Client requests changes to the agreement before approving via portal.
  async requestChanges(_token: string, dto: PortalRequestChangesDto) {
    const { agreementId, portalTokenId } = this.getPortalContext();

    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      select: {
        id: true,
        title: true,
        status: true,
        freelancerId: true,
        freelancer: { select: { email: true, name: true } },
      },
    });

    if (!agreement) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }

    if (!CHANGEABLE_STATUSES.has(agreement.status)) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_CHANGEABLE });
    }

    const updatedAgreement = await this.prisma.$transaction(async (tx) => {
      const result = await tx.agreement.update({
        where: { id: agreementId },
        data: { status: AgreementStatus.CHANGE_REQUESTED },
      });

      try {
        await this.timelineEventsService.createEvent(
          {
            actorId: portalTokenId,
            actorRole: TimelineActorRole.CLIENT,
            agreementId,
            type: TimelineEventType.AGREEMENT_CHANGES_REQUESTED,
            title: 'Agreement Changes Requested',
            description: `Client requested changes: ${dto.reason}`,
            metadata: {
              reason: dto.reason,
              requestedChanges: dto.requestedChanges ?? [],
            },
          },
          tx,
        );
      } catch {
        // Timeline failure is non-blocking per spec
      }

      return result;
    });

    // Email notification - non-blocking
    try {
      if (agreement.freelancer.email) {
        await this.emailService.sendNotification({
          agreementId,
          locale: 'ar',
          metadata: {
            actorRole: 'CLIENT',
            reason: dto.reason,
            requestedChanges: dto.requestedChanges,
          },
          recipientEmail: agreement.freelancer.email,
          recipientName: agreement.freelancer.name,
          type: NotificationType.AGREEMENT_CHANGE_REQUESTED,
        });
      }
    } catch {
      // Email failure is non-blocking per spec
    }

    return {
      agreementId,
      status: updatedAgreement.status,
      message: 'Agreement changes requested successfully.',
    };
  }

  // AR: يرفض العميل دعوة الاتفاق عبر البوابة.
  // EN: Client rejects the agreement invitation via portal.
  async rejectAgreement(_token: string, dto: PortalRejectAgreementDto) {
    const { agreementId, portalTokenId } = this.getPortalContext();

    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      select: {
        id: true,
        title: true,
        status: true,
        freelancerId: true,
        freelancer: { select: { email: true, name: true } },
      },
    });

    if (!agreement) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }

    if (!REJECTABLE_STATUSES.has(agreement.status)) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_REJECTABLE });
    }

    const updatedAgreement = await this.prisma.$transaction(async (tx) => {
      const result = await tx.agreement.update({
        where: { id: agreementId },
        data: { status: AgreementStatus.CANCELLED },
      });

      try {
        await this.timelineEventsService.createEvent(
          {
            actorId: portalTokenId,
            actorRole: TimelineActorRole.CLIENT,
            agreementId,
            type: TimelineEventType.AGREEMENT_REJECTED,
            title: 'Agreement Rejected',
            description: `Client rejected agreement: ${dto.reason}`,
            metadata: { reason: dto.reason },
          },
          tx,
        );
      } catch {
        // Timeline failure is non-blocking per spec
      }

      return result;
    });

    // Email notification - non-blocking
    try {
      if (agreement.freelancer.email) {
        await this.emailService.sendNotification({
          agreementId,
          locale: 'ar',
          metadata: { actorRole: 'CLIENT', reason: dto.reason },
          recipientEmail: agreement.freelancer.email,
          recipientName: agreement.freelancer.name,
          type: NotificationType.AGREEMENT_CHANGE_REQUESTED,
        });
      }
    } catch {
      // Email failure is non-blocking per spec
    }

    return {
      agreementId,
      status: updatedAgreement.status,
      message: 'Agreement rejected.',
    };
  }

  // ──────────────────────────────────────────────────────────
  //  Workspace
  // ──────────────────────────────────────────────────────────

  // AR: يعيد مساحة عمل البوابة الكاملة المقتصرة على الاتفاق المرتبط بالرمز.
  // EN: Returns the full portal workspace scoped to the token agreement.
  async getPortal(_token: string) {
    const { agreementId } = this.getPortalContext();

    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      include: {
        freelancer: { select: { name: true } },
        client: { select: { name: true } },
        milestones: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            order: true,
            title: true,
            description: true,
            amount: true,
            currency: true,
            status: true,
            dueDate: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            milestoneId: true,
            amount: true,
            currency: true,
            status: true,
          },
        },
        deliveries: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            milestoneId: true,
            status: true,
            submittedAt: true,
            notes: true,
            milestone: { select: { title: true } },
          },
        },
        changeRequests: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            description: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        },
        aiReviews: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            reasoning: true,
            createdAt: true,
          },
        },
        timelineEvents: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            type: true,
            actorRole: true,
            description: true,
            createdAt: true,
          },
        },
      },
    });

    if (!agreement) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }

    const milestoneTitleMap = new Map<string, string>();
    for (const m of agreement.milestones) {
      milestoneTitleMap.set(m.id, m.title);
    }

    return {
      agreementId: agreement.id,
      title: agreement.title,
      status: agreement.status,
      totalAmount: String(agreement.totalAmount),
      currency: agreement.currency,
      freelancerName: agreement.freelancer.name,
      clientName: agreement.client?.name ?? '',
      milestones: agreement.milestones.map((m) => ({
        id: m.id,
        order: m.order,
        title: m.title,
        description: m.description ?? undefined,
        amount: String(m.amount),
        currency: m.currency,
        status: m.status,
        dueDate: m.dueDate?.toISOString() ?? undefined,
      })),
      payments: agreement.payments.map((p) => ({
        milestoneId: p.milestoneId ?? '',
        milestoneTitle: milestoneTitleMap.get(p.milestoneId ?? '') ?? '',
        amount: String(p.amount),
        currency: p.currency,
        status: p.status,
      })),
      deliveries: agreement.deliveries.map((d) => ({
        id: d.id,
        milestoneId: d.milestoneId,
        milestoneTitle: d.milestone.title,
        status: d.status,
        submittedAt: d.submittedAt?.toISOString() ?? undefined,
        notes: d.notes ?? undefined,
      })),
      changeRequests: agreement.changeRequests.map((cr) => ({
        id: cr.id,
        title: cr.title,
        description: cr.description,
        requestedAmount: String(cr.amount),
        status: cr.status,
        createdAt: cr.createdAt.toISOString(),
      })),
      aiReviews: agreement.aiReviews.map((review) => ({
        id: review.id,
        status: review.status,
        conclusion: review.reasoning ?? undefined,
        createdAt: review.createdAt.toISOString(),
      })),
      timeline: agreement.timelineEvents.map((event) => ({
        id: event.id,
        eventType: event.type,
        actorRole: event.actorRole,
        description: event.description ?? undefined,
        occurredAt: event.createdAt.toISOString(),
      })),
    };
  }

  // ──────────────────────────────────────────────────────────
  //  Delivery Actions (delegated to DeliveriesService)
  // ──────────────────────────────────────────────────────────

  // AR: يعيد تفاصيل تسليم واحد مقتصر على اتفاق الرمز.
  // EN: Returns a single delivery detail scoped to the token agreement.
  async getDelivery(token: string, deliveryId: string) {
    this.getPortalContext();

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: {
        id: true,
        agreementId: true,
        milestoneId: true,
        status: true,
        submittedAt: true,
        notes: true,
        milestone: { select: { title: true } },
      },
    });

    if (!delivery) {
      throw new AppException({ code: ErrorCode.DELIVERY_NOT_FOUND });
    }

    const { agreementId } = this.getPortalContext();
    if (delivery.agreementId !== agreementId) {
      throw new AppException({ code: ErrorCode.DELIVERY_NOT_FOUND });
    }

    return {
      id: delivery.id,
      milestoneId: delivery.milestoneId,
      milestoneTitle: delivery.milestone.title,
      status: delivery.status,
      submittedAt: delivery.submittedAt?.toISOString() ?? undefined,
      notes: delivery.notes ?? undefined,
    };
  }

  // AR: يفوض قبول التسليم إلى خدمة التسليمات مع التحقق من نطاق الرمز.
  // EN: Delegates delivery acceptance to DeliveriesService with token scope verification.
  async acceptDelivery(token: string, deliveryId: string) {
    this.getPortalContext();
    return this.deliveriesService.acceptDeliveryFromPortal(token, deliveryId);
  }

  // AR: يفوض طلب تعديلات التسليم إلى خدمة التسليمات مع التحقق من نطاق الرمز.
  // EN: Delegates delivery change requests to DeliveriesService with token scope verification.
  async requestDeliveryChanges(
    token: string,
    deliveryId: string,
    dto: PortalRequestChangesDto,
  ) {
    this.getPortalContext();
    return this.deliveriesService.requestChangesFromPortal(token, deliveryId, {
      reason: dto.reason,
      requestedCriteria: dto.requestedChanges,
    });
  }

  // ──────────────────────────────────────────────────────────
  //  Payment Actions (delegated to PaymentsService)
  // ──────────────────────────────────────────────────────────

  // AR: يعيد خطة الدفع للاتفاق المرتبط بالرمز.
  // EN: Returns the payment plan scoped to the token agreement.
  async getPayments(_token: string) {
    const { agreementId } = this.getPortalContext();

    const payments = await this.prisma.payment.findMany({
      where: { agreementId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        milestoneId: true,
        amount: true,
        currency: true,
        status: true,
        demoMode: true,
        reservedAt: true,
        releasedAt: true,
        createdAt: true,
      },
    });

    const milestoneIds = [
      ...new Set(payments.map((p) => p.milestoneId).filter(Boolean)),
    ];
    const milestones = await this.prisma.milestone.findMany({
      where: { id: { in: milestoneIds as string[] } },
      select: { id: true, title: true },
    });
    const milestoneTitleMap = new Map(milestones.map((m) => [m.id, m.title]));

    return {
      agreementId,
      payments: payments.map((p) => ({
        id: p.id,
        milestoneId: p.milestoneId ?? '',
        milestoneTitle: milestoneTitleMap.get(p.milestoneId ?? '') ?? '',
        amount: String(p.amount),
        currency: p.currency,
        status: p.status,
        demoMode: p.demoMode,
        createdAt: p.createdAt.toISOString(),
        fundedAt: p.reservedAt?.toISOString() ?? undefined,
        releasedAt: p.releasedAt?.toISOString() ?? undefined,
      })),
    };
  }

  // AR: يفوض تمويل الدفعة إلى خدمة المدفوعات بعد التحقق من ملكية الاتفاق.
  // EN: Delegates payment funding to PaymentsService after verifying agreement ownership.
  async fundPayment(
    token: string,
    paymentId: string,
    dto: PortalFundPaymentDto,
  ) {
    this.getPortalContext();
    return this.paymentsService.portalFund(token, paymentId, dto);
  }

  // AR: يفوض تحرير الدفعة إلى خدمة المدفوعات بعد التحقق من ملكية الاتفاق.
  // EN: Delegates payment release to PaymentsService after verifying agreement ownership.
  async releasePayment(
    token: string,
    paymentId: string,
    dto: PortalReleaseConfirmationDto,
  ) {
    this.getPortalContext();
    return this.paymentsService.portalReleaseConfirmation(
      token,
      paymentId,
      dto,
    );
  }

  // AR: يعيد سجل المدفوعات للاتفاق المرتبط بالرمز.
  // EN: Returns payment history scoped to the token agreement.
  async getPaymentHistory(_token: string) {
    const { agreementId } = this.getPortalContext();

    const payments = await this.prisma.payment.findMany({
      where: { agreementId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        milestoneId: true,
        amount: true,
        currency: true,
        status: true,
        demoMode: true,
        reservedAt: true,
        releasedAt: true,
        createdAt: true,
      },
    });

    const milestoneIds = [
      ...new Set(payments.map((p) => p.milestoneId).filter(Boolean)),
    ];
    const milestones = await this.prisma.milestone.findMany({
      where: { id: { in: milestoneIds as string[] } },
      select: { id: true, title: true },
    });
    const milestoneTitleMap = new Map(milestones.map((m) => [m.id, m.title]));

    return {
      agreementId,
      payments: payments.map((p) => ({
        id: p.id,
        milestoneId: p.milestoneId ?? '',
        milestoneTitle: milestoneTitleMap.get(p.milestoneId ?? '') ?? '',
        amount: String(p.amount),
        currency: p.currency,
        status: p.status,
        demoMode: p.demoMode,
        createdAt: p.createdAt.toISOString(),
        fundedAt: p.reservedAt?.toISOString() ?? undefined,
        releasedAt: p.releasedAt?.toISOString() ?? undefined,
      })),
    };
  }

  // ──────────────────────────────────────────────────────────
  //  Timeline
  // ──────────────────────────────────────────────────────────

  // AR: يعيد سجل الأحداث الزمنية للاتفاق المرتبط بالرمز مع بيانات آمنة للعميل.
  // EN: Returns timeline events scoped to the token agreement with client-safe data.
  async getTimeline(_token: string) {
    const { agreementId } = this.getPortalContext();

    const events = await this.prisma.timelineEvent.findMany({
      where: { agreementId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        type: true,
        actorRole: true,
        description: true,
        createdAt: true,
      },
    });

    return events.map((event) => ({
      id: event.id,
      eventType: event.type,
      actorRole: event.actorRole,
      description: event.description ?? undefined,
      occurredAt: event.createdAt.toISOString(),
    }));
  }
}
