import { Injectable } from '@nestjs/common';
import {
  Prisma,
  TimelineActorRole,
  TimelineEventType,
  MilestoneStatus as PrismaMilestoneStatus,
  PaymentStatus as PrismaPaymentStatus,
  AgreementStatus as PrismaAgreementStatus,
  PortalTokenType,
} from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { ClsService } from '../../common/cls/cls.service';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AgreementPoliciesService } from '../agreement-policies/agreement-policies.service';
import { ClientsService } from '../clients/clients.service';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import { TimelineEventsService } from '../timeline-events/timeline-events.service';
import {
  AgreementListResponseDto,
  AgreementListItemDto,
} from './dto/agreement-list.dto';
import { AgreementQueryDto } from './dto/agreement-query.dto';
import { AgreementResponseDto } from './dto/agreement-response.dto';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';

type AgreementWithIncludes = Prisma.AgreementGetPayload<{
  include: {
    client: true;
    milestones: { orderBy: { order: 'asc' } };
    policy: true;
  };
}>;

type AgreementListRow = Prisma.AgreementGetPayload<{
  select: {
    id: true;
    title: true;
    clientId: true;
    client: { select: { name: true } };
    totalAmount: true;
    currency: true;
    status: true;
    sentAt: true;
    createdAt: true;
    _count: { select: { milestones: true } };
  };
}>;

@Injectable()
export class AgreementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
    private readonly agreementPoliciesService: AgreementPoliciesService,
    private readonly clientsService: ClientsService,
    private readonly timelineEvents: TimelineEventsService,
    private readonly emailNotifications: EmailNotificationsService,
  ) {}

  async create(dto: CreateAgreementDto): Promise<AgreementResponseDto> {
    const freelancerId = this.getFreelancerId();

    if (dto.clientId) {
      await this.clientsService.getById(dto.clientId);
    }

    const currency = dto.currency ?? (await this.getCurrency(freelancerId));

    const agreement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.agreement.create({
        data: {
          freelancerId,
          title: dto.title,
          description: dto.description ?? null,
          serviceType: dto.serviceType ?? null,
          clientId: dto.clientId ?? null,
          totalAmount: 0,
          currency,
          durationText: dto.durationText ?? null,
          expectedDeliveryDate: dto.expectedDeliveryDate
            ? new Date(dto.expectedDeliveryDate)
            : null,
          status: PrismaAgreementStatus.DRAFT,
        },
        include: {
          client: true,
          milestones: { orderBy: { order: 'asc' } },
          policy: true,
        },
      });

      await this.timelineEvents.createEvent(
        {
          agreementId: created.id,
          type: TimelineEventType.AGREEMENT_CREATED,
          actorRole: TimelineActorRole.FREELANCER,
          actorId: freelancerId,
          title: 'Agreement created',
          description: 'A new agreement draft was created.',
        },
        tx,
      );

      return created;
    });

    const copiedPolicy =
      await this.agreementPoliciesService.copyDefaultsToAgreement(agreement.id);
    agreement.policy =
      copiedPolicy as unknown as AgreementWithIncludes['policy'];

    return this.mapToResponse(agreement);
  }

  list(query: AgreementQueryDto = {}): Promise<AgreementListResponseDto> {
    return this.findAll(query);
  }

  async findAll(
    query: AgreementQueryDto = {},
  ): Promise<AgreementListResponseDto> {
    const freelancerId = this.getFreelancerId();

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AgreementWhereInput = { freelancerId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { client: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, agreements] = await this.prisma.$transaction([
      this.prisma.agreement.count({ where }),
      this.prisma.agreement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          clientId: true,
          client: { select: { name: true } },
          totalAmount: true,
          currency: true,
          status: true,
          sentAt: true,
          createdAt: true,
          _count: { select: { milestones: true } },
        },
      }),
    ]);

    return {
      data: agreements.map((agreement) => this.mapToListItem(agreement)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<AgreementResponseDto> {
    const freelancerId = this.getFreelancerId();

    const agreement = await this.prisma.agreement.findFirst({
      where: { id, freelancerId },
      include: {
        client: true,
        milestones: { orderBy: { order: 'asc' } },
        policy: true,
      },
    });

    if (!agreement) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }

    return this.mapToResponse(agreement);
  }

  getById(id: string): Promise<AgreementResponseDto> {
    return this.findOne(id);
  }

  async update(
    id: string,
    dto: UpdateAgreementDto,
  ): Promise<AgreementResponseDto> {
    const freelancerId = this.getFreelancerId();

    const existing = await this.prisma.agreement.findFirst({
      where: { id, freelancerId },
      include: {
        client: true,
        milestones: { orderBy: { order: 'asc' } },
        policy: true,
      },
    });

    if (!existing) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }

    if (existing.status !== PrismaAgreementStatus.DRAFT) {
      throw new AppException({ code: ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED });
    }

    if (dto.clientId !== undefined && dto.clientId !== existing.clientId) {
      await this.clientsService.getById(dto.clientId);
    }

    if (dto.totalAmount !== undefined) {
      const milestoneSum = await this.prisma.milestone.aggregate({
        where: { agreementId: id },
        _sum: { amount: true },
      });
      const sum = Number(milestoneSum._sum.amount ?? 0);

      if (sum > 0 && sum !== dto.totalAmount) {
        throw new AppException({ code: ErrorCode.PAYMENT_INVALID_AMOUNT });
      }
    }

    const data: Prisma.AgreementUpdateInput = {};

    if (dto.title !== undefined) {
      data.title = dto.title;
    }
    if (dto.description !== undefined) {
      data.description = dto.description;
    }
    if (dto.serviceType !== undefined) {
      data.serviceType = dto.serviceType;
    }
    if (dto.clientId !== undefined) {
      data.client = { connect: { id: dto.clientId } };
    }
    if (dto.totalAmount !== undefined) {
      data.totalAmount = dto.totalAmount;
    }
    if (dto.currency !== undefined) {
      data.currency = dto.currency;
    }
    if (dto.durationText !== undefined) {
      data.durationText = dto.durationText;
    }
    if (dto.expectedDeliveryDate !== undefined) {
      data.expectedDeliveryDate = new Date(dto.expectedDeliveryDate);
    }

    const updated = await this.prisma.agreement.update({
      where: { id },
      data,
      include: {
        client: true,
        milestones: { orderBy: { order: 'asc' } },
        policy: true,
      },
    });

    return this.mapToResponse(updated);
  }

  async sendInvite(id: string): Promise<AgreementResponseDto> {
    const freelancerId = this.getFreelancerId();

    const agreement = await this.prisma.agreement.findFirst({
      where: { id, freelancerId },
      include: {
        client: true,
        milestones: { orderBy: { order: 'asc' } },
        policy: true,
      },
    });

    if (!agreement) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }

    if (agreement.status !== PrismaAgreementStatus.DRAFT) {
      throw new AppException({ code: ErrorCode.AGREEMENT_ALREADY_SENT });
    }

    if (!agreement.clientId || !agreement.client) {
      throw new AppException({ code: ErrorCode.AGREEMENT_CLIENT_REQUIRED });
    }

    if (agreement.milestones.length === 0) {
      throw new AppException({
        code: ErrorCode.VALIDATION_ERROR,
        details: { reason: 'AGREEMENT_MILESTONES_REQUIRED' },
      });
    }

    if (!agreement.policy) {
      throw new AppException({ code: ErrorCode.AGREEMENT_POLICY_REQUIRED });
    }

    const milestoneAggregate = await this.prisma.milestone.aggregate({
      where: { agreementId: id },
      _sum: { amount: true },
    });
    const milestoneSum = milestoneAggregate._sum.amount ?? 0;

    if (Number(agreement.totalAmount) !== Number(milestoneSum)) {
      throw new AppException({ code: ErrorCode.PAYMENT_INVALID_AMOUNT });
    }

    const inviteToken = randomBytes(48).toString('base64url');
    const portalToken = randomBytes(48).toString('base64url');

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedAgreement = await tx.agreement.update({
        where: { id },
        data: {
          status: PrismaAgreementStatus.SENT,
          sentAt: new Date(),
          inviteToken,
          portalToken,
        },
        include: {
          client: true,
          milestones: { orderBy: { order: 'asc' } },
          policy: true,
        },
      });

      await tx.portalToken.createMany({
        data: [
          {
            agreementId: id,
            tokenHash: createHash('sha256').update(inviteToken).digest('hex'),
            tokenPreview: inviteToken.substring(0, 8),
            type: PortalTokenType.AGREEMENT_INVITE,
          },
          {
            agreementId: id,
            tokenHash: createHash('sha256').update(portalToken).digest('hex'),
            tokenPreview: portalToken.substring(0, 8),
            type: PortalTokenType.AGREEMENT_APPROVAL,
          },
        ],
      });

      await this.timelineEvents.createEvent(
        {
          agreementId: id,
          type: TimelineEventType.AGREEMENT_SENT,
          actorRole: TimelineActorRole.FREELANCER,
          actorId: freelancerId,
          title: 'Agreement sent to client',
          description: 'The agreement invite was sent to the linked client.',
        },
        tx,
      );

      return updatedAgreement;
    });

    try {
      await this.emailNotifications.enqueueAgreementInvite({
        agreementId: id,
        recipientEmail: agreement.client.email,
        clientName: agreement.client.name,
        agreementTitle: agreement.title,
        inviteToken,
      });
    } catch (emailError) {
      console.error(
        `[AgreementsService.sendInvite] Failed to enqueue invite email for agreement ${id}:`,
        emailError,
      );
    }

    return this.mapToResponse(updated);
  }

  resendInvite(id: string, userId: string) {
    return this.emailNotifications.resendAgreementInvite(id, userId);
  }

  async approve(id: string): Promise<AgreementResponseDto> {
    const freelancerId = this.getFreelancerId();

    const agreement = await this.prisma.agreement.findFirst({
      where: { id, freelancerId },
      include: {
        client: true,
        milestones: { orderBy: { order: 'asc' } },
        policy: true,
      },
    });

    if (!agreement) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }

    if (
      agreement.status !== PrismaAgreementStatus.DRAFT &&
      agreement.status !== PrismaAgreementStatus.SENT
    ) {
      throw new AppException({ code: ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED });
    }

    const updated = await this.prisma.agreement.update({
      where: { id },
      data: {
        status: PrismaAgreementStatus.APPROVED,
        approvedAt: new Date(),
      },
      include: {
        client: true,
        milestones: { orderBy: { order: 'asc' } },
        policy: true,
      },
    });

    return this.mapToResponse(updated);
  }

  async activate(id: string): Promise<AgreementResponseDto> {
    const freelancerId = this.getFreelancerId();

    const agreement = await this.prisma.agreement.findFirst({
      where: { id, freelancerId },
      include: {
        client: true,
        milestones: { orderBy: { order: 'asc' } },
        policy: true,
      },
    });

    if (!agreement) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }

    if (agreement.status !== PrismaAgreementStatus.APPROVED) {
      throw new AppException({ code: ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedAgreement = await tx.agreement.update({
        where: { id },
        data: { status: PrismaAgreementStatus.ACTIVE },
        include: {
          client: true,
          milestones: { orderBy: { order: 'asc' } },
          policy: true,
        },
      });

      const firstDraftMilestone = await tx.milestone.findFirst({
        where: { agreementId: id, status: PrismaMilestoneStatus.DRAFT },
        orderBy: { order: 'asc' },
      });

      if (firstDraftMilestone) {
        await tx.milestone.update({
          where: { id: firstDraftMilestone.id },
          data: { status: PrismaMilestoneStatus.ACTIVE },
        });
      }

      await this.timelineEvents.createEvent(
        {
          agreementId: id,
          type: TimelineEventType.AGREEMENT_ACTIVATED,
          actorRole: TimelineActorRole.FREELANCER,
          actorId: freelancerId,
          title: 'Agreement activated',
          description: 'Agreement activated; work begins.',
          metadata: {
            titleEn: 'Agreement activated',
            titleAr: 'تم تفعيل الاتفاقية',
            descriptionEn: 'Agreement activated; work begins.',
            descriptionAr: 'تم تفعيل الاتفاقية وبدأ العمل.',
          },
        },
        tx,
      );

      return updatedAgreement;
    });

    try {
      if (agreement.client?.email) {
        await this.emailNotifications.enqueueAgreementActivatedForClient({
          agreementId: id,
          recipientEmail: agreement.client.email,
          agreementTitle: agreement.title,
        });
      }
    } catch (emailError) {
      console.error(
        `[AgreementsService.activate] Failed to enqueue activation email for agreement ${id}:`,
        emailError,
      );
    }

    return this.mapToResponse(updated);
  }

  async archive(id: string): Promise<AgreementResponseDto> {
    const freelancerId = this.getFreelancerId();

    const agreement = await this.prisma.agreement.findFirst({
      where: { id, freelancerId },
      include: {
        client: true,
        milestones: { orderBy: { order: 'asc' } },
        policy: true,
      },
    });

    if (!agreement) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }

    if (agreement.status === PrismaAgreementStatus.COMPLETED) {
      throw new AppException({ code: ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED });
    }

    const preArchiveStatus = agreement.status;
    const isVisibleForNotification =
      preArchiveStatus !== PrismaAgreementStatus.DRAFT;

    const updated = await this.prisma.$transaction(async (tx) => {
      const cancelledAgreement = await tx.agreement.update({
        where: { id },
        data: { status: PrismaAgreementStatus.CANCELLED },
        include: {
          client: true,
          milestones: { orderBy: { order: 'asc' } },
          policy: true,
        },
      });

      await tx.milestone.updateMany({
        where: {
          agreementId: id,
          status: { not: PrismaMilestoneStatus.ACCEPTED },
        },
        data: { status: PrismaMilestoneStatus.CANCELLED },
      });

      if (preArchiveStatus === PrismaAgreementStatus.ACTIVE) {
        const unfinishedMilestoneIds = agreement.milestones
          .filter(
            (milestone) => milestone.status !== PrismaMilestoneStatus.ACCEPTED,
          )
          .map((milestone) => milestone.id);

        if (unfinishedMilestoneIds.length > 0) {
          await tx.payment.updateMany({
            where: {
              agreementId: id,
              milestoneId: { in: unfinishedMilestoneIds },
              status: {
                in: [PrismaPaymentStatus.WAITING, PrismaPaymentStatus.FAILED],
              },
            },
            data: { status: PrismaPaymentStatus.NOT_REQUIRED },
          });

          await tx.payment.updateMany({
            where: {
              agreementId: id,
              milestoneId: { in: unfinishedMilestoneIds },
              status: {
                in: [
                  PrismaPaymentStatus.RESERVED,
                  PrismaPaymentStatus.CLIENT_REVIEW,
                  PrismaPaymentStatus.AI_REVIEW,
                  PrismaPaymentStatus.READY_TO_RELEASE,
                  PrismaPaymentStatus.ON_HOLD,
                ],
              },
            },
            data: { status: PrismaPaymentStatus.REFUNDED },
          });
        }
      }

      await this.timelineEvents.createEvent(
        {
          agreementId: id,
          type: TimelineEventType.AGREEMENT_CANCELLED,
          actorRole: TimelineActorRole.FREELANCER,
          actorId: freelancerId,
          title: 'Agreement cancelled',
          description: 'Agreement cancelled; unfinished work stopped.',
          metadata: {
            titleEn: 'Agreement cancelled',
            titleAr: 'تم إلغاء الاتفاقية',
            descriptionEn: 'Agreement cancelled; unfinished work stopped.',
            descriptionAr: 'تم إلغاء الاتفاقية وإيقاف العمل غير المكتمل.',
          },
        },
        tx,
      );

      return cancelledAgreement;
    });

    if (isVisibleForNotification) {
      try {
        if (agreement.client?.email) {
          await this.emailNotifications.enqueueAgreementCancelledForClient({
            agreementId: id,
            recipientEmail: agreement.client.email,
            agreementTitle: agreement.title,
          });
        }
      } catch (emailError) {
        console.error(
          `[AgreementsService.archive] Failed to enqueue cancellation email for agreement ${id}:`,
          emailError,
        );
      }
    }

    return this.mapToResponse(updated);
  }

  async recalculateTotalAmount(
    tx: Prisma.TransactionClient,
    agreementId: string,
  ): Promise<{ agreementId: string; totalAmount: number }> {
    const freelancerId = this.getFreelancerId();

    const agreement = await tx.agreement.findFirst({
      where: { id: agreementId, freelancerId },
    });

    if (!agreement) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }

    if (agreement.status !== PrismaAgreementStatus.DRAFT) {
      throw new AppException({ code: ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED });
    }

    const milestoneAggregate = await tx.milestone.aggregate({
      where: { agreementId },
      _sum: { amount: true },
    });
    const totalAmount = Number(milestoneAggregate._sum.amount ?? 0);

    const updated = await tx.agreement.update({
      where: { id: agreement.id },
      data: { totalAmount },
    });

    return {
      agreementId: updated.id,
      totalAmount: Number(updated.totalAmount),
    };
  }

  async checkCompletionStatus(
    tx: Prisma.TransactionClient,
    agreementId: string,
  ): Promise<{
    agreementId: string;
    completed: boolean;
    status: PrismaAgreementStatus;
    timelineEventCreated: boolean;
  }> {
    const freelancerId = this.getFreelancerId();

    const agreement = await tx.agreement.findFirst({
      where: { id: agreementId, freelancerId },
    });

    if (!agreement) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }

    if (agreement.status !== PrismaAgreementStatus.ACTIVE) {
      return {
        agreementId: agreement.id,
        completed: false,
        status: agreement.status,
        timelineEventCreated: false,
      };
    }

    const milestones = await tx.milestone.findMany({
      where: { agreementId: agreement.id },
      select: { status: true, paymentStatus: true },
    });

    if (
      milestones.length === 0 ||
      milestones.some(
        (milestone) =>
          milestone.status !== PrismaMilestoneStatus.ACCEPTED ||
          milestone.paymentStatus !== PrismaPaymentStatus.RELEASED,
      )
    ) {
      return {
        agreementId: agreement.id,
        completed: false,
        status: agreement.status,
        timelineEventCreated: false,
      };
    }

    const completedAgreement = await tx.agreement.update({
      where: { id: agreement.id },
      data: { status: PrismaAgreementStatus.COMPLETED },
    });

    await this.timelineEvents.createEvent(
      {
        agreementId: agreement.id,
        type: TimelineEventType.AGREEMENT_COMPLETED,
        actorRole: TimelineActorRole.FREELANCER,
        actorId: freelancerId,
        title: 'Agreement completed',
        description:
          'Agreement completed after all milestones were accepted and released.',
        metadata: {
          titleEn: 'Agreement completed',
          titleAr: 'تم إكمال الاتفاقية',
          descriptionEn:
            'Agreement completed after all milestones were accepted and released.',
          descriptionAr: 'تم إكمال الاتفاقية بعد قبول وتحرير جميع المراحل.',
        },
      },
      tx,
    );

    return {
      agreementId: completedAgreement.id,
      completed: true,
      status: completedAgreement.status,
      timelineEventCreated: true,
    };
  }

  private getFreelancerId(): string {
    const id = this.cls.get('userId');

    if (!id) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    return id;
  }

  private async getCurrency(freelancerId: string): Promise<string> {
    const settings = await this.prisma.userSettings.findFirst({
      where: { userId: freelancerId },
      select: { preferredCurrency: true },
    });

    return settings?.preferredCurrency ?? 'SAR';
  }

  private mapToResponse(
    agreement: AgreementWithIncludes,
  ): AgreementResponseDto {
    return {
      id: agreement.id,
      freelancerId: agreement.freelancerId,
      clientId: agreement.clientId,
      client: agreement.client ?? null,
      title: agreement.title,
      description: agreement.description,
      serviceType: agreement.serviceType,
      totalAmount: Number(agreement.totalAmount),
      currency: agreement.currency,
      durationText: agreement.durationText,
      expectedDeliveryDate: agreement.expectedDeliveryDate,
      status: agreement.status as unknown as AgreementResponseDto['status'],
      inviteToken: agreement.inviteToken,
      portalToken: agreement.portalToken,
      approvedAt: agreement.approvedAt,
      sentAt: agreement.sentAt,
      createdAt: agreement.createdAt,
      updatedAt: agreement.updatedAt,
      milestones: agreement.milestones ?? [],
      policy: agreement.policy ?? null,
    };
  }

  private mapToListItem(agreement: AgreementListRow): AgreementListItemDto {
    return {
      id: agreement.id,
      title: agreement.title,
      clientId: agreement.clientId,
      clientName: agreement.client?.name ?? null,
      totalAmount: Number(agreement.totalAmount),
      currency: agreement.currency,
      status: agreement.status as unknown as AgreementListItemDto['status'],
      milestonesCount: agreement._count.milestones,
      sentAt: agreement.sentAt,
      createdAt: agreement.createdAt,
    };
  }
}
