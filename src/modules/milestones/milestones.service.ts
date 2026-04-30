import { Injectable } from '@nestjs/common';
import {
  AgreementStatus,
  DeliveryStatus,
  Milestone,
  MilestoneStatus,
  PaymentStatus,
  Prisma,
  TimelineActorRole,
  TimelineEventType,
} from '@prisma/client';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AgreementsService } from '../agreements/agreements.service';
import { PaymentsService } from '../payments/payments.service';
import { TimelineEventsService } from '../timeline-events/timeline-events.service';
import {
  AcceptanceCriterionDto,
  CreateMilestoneDto,
  ReorderMilestonesDto,
  UpdateMilestoneDto,
} from './dto/milestones.dto';

type TransactionClient = Prisma.TransactionClient;
type AgreementRecord = {
  currency: string;
  freelancerId: string;
  id: string;
  status: AgreementStatus;
  totalAmount: Prisma.Decimal;
};
type MilestoneWithAgreement = Milestone & { agreement: AgreementRecord };
type ReorderItem = { milestoneId: string; orderIndex: number };
const AMOUNT_WARNING_MESSAGE = 'Milestone total does not match agreement total';
const MODIFIABLE_AGREEMENT_STATUSES = new Set<AgreementStatus>([
  AgreementStatus.DRAFT,
]);

/**
 * Module responsibility:
 * - Manage agreement milestones, ordering, and review states.
 * Main entities touched:
 * - Milestone, Agreement, Payment, Delivery, TimelineEvent.
 * Expected endpoints:
 * - POST /agreements/:agreementId/milestones
 * - PATCH /milestones/:id
 * - DELETE /milestones/:id
 * - PATCH /milestones/:id/reorder
 * - GET /milestones/:id
 * - GET /agreements/:agreementId/milestones
 * Business rules:
 * - Phase 2 implements core CRUD and amount warnings.
 * - Phase 3 implements reorder validation and mutation gates.
 * - Phase 4 emits milestone timeline events inside mutation transactions.
 * Implementation phases:
 * - Phase 2 core CRUD.
 * - Phase 3 reorder and business rules.
 * - Phase 4 timeline integration.
 * Error cases to document:
 * - AGREEMENT_NOT_FOUND, AGREEMENT_CANNOT_BE_MODIFIED, MILESTONE_NOT_FOUND,
 *   MILESTONE_INVALID_AMOUNT, MILESTONE_INVALID_ORDER.
 * Testing cases to cover:
 * - owned draft creation, payment sync, safe deletion, ordered reads, invalid totals.
 */
@Injectable()
export class MilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly timelineEventsService: TimelineEventsService,
    private readonly agreementsService?: AgreementsService,
  ) {}

  // AR: ينشئ مرحلة داخل اتفاق مملوك في حالة مسودة مع دفعة انتظار تجريبية وتحذير إجمالي عند الحاجة.
  // EN: Creates a milestone for an owned draft agreement with a waiting demo payment and amount warning when needed.
  async createMilestone(
    agreementId: string,
    dto: CreateMilestoneDto,
    userId: string,
  ) {
    const requiredUserId = this.getRequiredUserId(userId);
    const amount = this.parseMoney(dto.amount);
    const acceptanceCriteria = this.normalizeAcceptanceCriteria(
      dto.acceptanceCriteria,
    );

    return this.prisma.$transaction(async (tx) => {
      const agreement = await this.findOwnedAgreement(
        agreementId,
        requiredUserId,
        tx,
      );

      this.ensureAgreementModifiable(agreement);
      await this.assertOrderAvailable(agreement.id, dto.orderIndex, tx);

      const milestone = await tx.milestone.create({
        data: {
          acceptanceCriteria: acceptanceCriteria,
          agreementId: agreement.id,
          amount,
          currency: agreement.currency,
          deliveryStatus: DeliveryStatus.NOT_SUBMITTED,
          description: dto.description ?? null,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          order: dto.orderIndex,
          paymentStatus: PaymentStatus.WAITING,
          revisionLimit: dto.revisionLimit ?? 3,
          status: MilestoneStatus.DRAFT,
          title: dto.title,
        },
      });

      await this.paymentsService.createPaymentForMilestone(tx, {
        agreementId: agreement.id,
        amount,
        currency: agreement.currency,
        milestoneId: milestone.id,
      });

      await this.timelineEventsService.createEvent(
        {
          actorId: requiredUserId,
          actorRole: TimelineActorRole.FREELANCER,
          agreementId: agreement.id,
          description: `Milestone "${milestone.title}" was created.`,
          metadata: this.buildMilestoneTimelineMetadata(milestone),
          milestoneId: milestone.id,
          title: 'Milestone created',
          type: TimelineEventType.MILESTONE_CREATED,
        },
        tx,
      );

      await this.agreementsService?.recalculateTotalAmount(tx, agreement.id);

      const summary = await this.calculateAmountSummary(
        agreement.id,
        agreement.totalAmount,
        agreement.currency,
        tx,
      );

      return {
        data: this.mapMilestoneToResponse(milestone),
        ...(summary.amountWarning
          ? { amountWarning: summary.amountWarning }
          : {}),
      };
    });
  }

  // AR: يحدّث حقول المرحلة القابلة للتعديل ويزامن مبلغ الدفعة المرتبطة عند تغيير المبلغ.
  // EN: Updates editable milestone fields and syncs the linked payment amount when the amount changes.
  async updateMilestone(id: string, dto: UpdateMilestoneDto, userId: string) {
    const requiredUserId = this.getRequiredUserId(userId);

    return this.prisma.$transaction(async (tx) => {
      const milestone = await this.findOwnedMilestoneWithAgreement(
        id,
        requiredUserId,
        tx,
      );

      this.ensureAgreementModifiable(milestone.agreement);

      const updateData = this.buildMilestoneUpdateData(dto);
      const hasChanges = Object.keys(updateData).length > 0;
      const changedFields = this.getChangedFields(dto);
      const updatedMilestone = hasChanges
        ? await tx.milestone.update({
            where: { id: milestone.id },
            data: updateData,
          })
        : milestone;

      if (dto.amount !== undefined) {
        await this.paymentsService.syncMilestonePaymentAmount(tx, {
          amount: this.parseMoney(dto.amount),
          milestoneId: milestone.id,
        });
      }

      if (hasChanges) {
        await this.timelineEventsService.createEvent(
          {
            actorId: requiredUserId,
            actorRole: TimelineActorRole.FREELANCER,
            agreementId: milestone.agreement.id,
            description: `Milestone "${updatedMilestone.title}" was updated.`,
            metadata: {
              ...this.buildMilestoneTimelineMetadata(updatedMilestone),
              changedFields,
            },
            milestoneId: milestone.id,
            title: 'Milestone updated',
            type: TimelineEventType.MILESTONE_UPDATED,
          },
          tx,
        );
      }

      if (dto.amount !== undefined) {
        await this.agreementsService?.recalculateTotalAmount(
          tx,
          milestone.agreement.id,
        );
      }

      const summary = await this.calculateAmountSummary(
        milestone.agreement.id,
        milestone.agreement.totalAmount,
        milestone.agreement.currency,
        tx,
      );

      return {
        data: this.mapMilestoneToResponse(updatedMilestone),
        ...(summary.amountWarning
          ? { amountWarning: summary.amountWarning }
          : {}),
      };
    });
  }

  // AR: يحذف المرحلة فقط إذا كانت دفعتها المرتبطة ما زالت في حالة انتظار وداخل نفس المعاملة.
  // EN: Deletes the milestone only when its linked payment is still waiting and within the same transaction.
  async deleteMilestone(id: string, userId: string) {
    const requiredUserId = this.getRequiredUserId(userId);

    return this.prisma.$transaction(async (tx) => {
      const milestone = await this.findOwnedMilestoneWithAgreement(
        id,
        requiredUserId,
        tx,
      );

      this.ensureAgreementModifiable(milestone.agreement);

      await this.paymentsService.deleteWaitingPaymentForMilestone(tx, {
        milestoneId: milestone.id,
      });
      await this.timelineEventsService.createEvent(
        {
          actorId: requiredUserId,
          actorRole: TimelineActorRole.FREELANCER,
          agreementId: milestone.agreement.id,
          description: `Milestone "${milestone.title}" was deleted.`,
          metadata: this.buildMilestoneTimelineMetadata(milestone),
          milestoneId: milestone.id,
          title: 'Milestone deleted',
          type: TimelineEventType.MILESTONE_DELETED,
        },
        tx,
      );
      await tx.milestone.delete({ where: { id: milestone.id } });

      await this.agreementsService?.recalculateTotalAmount(
        tx,
        milestone.agreement.id,
      );

      return { success: true };
    });
  }

  // AR: يعيد ترتيب مراحل الاتفاق المملوك في حالة المسودة بقائمة كاملة وترتيب متصل.
  // EN: Reorders milestones for an owned draft agreement using a full replacement list and contiguous order values.
  async reorderMilestones(
    id: string,
    dto: ReorderMilestonesDto,
    userId: string,
  ) {
    const requiredUserId = this.getRequiredUserId(userId);
    const reorderItems = this.validateReorderPayload(dto);

    return this.prisma.$transaction(async (tx) => {
      const milestone = await this.findOwnedMilestoneWithAgreement(
        id,
        requiredUserId,
        tx,
      );

      this.ensureAgreementModifiable(milestone.agreement);

      const agreementMilestones = await tx.milestone.findMany({
        where: { agreementId: milestone.agreement.id },
        select: { id: true, order: true },
      });

      this.assertReorderMatchesAgreement(agreementMilestones, reorderItems);

      const orderById = new Map(
        reorderItems.map((item) => [item.milestoneId, item.orderIndex]),
      );

      for (const existing of agreementMilestones) {
        await tx.milestone.update({
          where: { id: existing.id },
          data: { order: -existing.order },
        });
      }

      for (const existing of agreementMilestones) {
        const nextOrder = orderById.get(existing.id);

        if (!nextOrder) {
          this.throwInvalidOrder();
        }

        await tx.milestone.update({
          where: { id: existing.id },
          data: { order: nextOrder },
        });
      }

      const updatedMilestones = await tx.milestone.findMany({
        where: { agreementId: milestone.agreement.id },
        orderBy: { order: 'asc' },
      });

      await this.timelineEventsService.createEvent(
        {
          actorId: requiredUserId,
          actorRole: TimelineActorRole.FREELANCER,
          agreementId: milestone.agreement.id,
          description: 'Milestones were reordered.',
          metadata: {
            orderedMilestoneIds: updatedMilestones.map((updated) => updated.id),
            order: updatedMilestones.map((updated) => ({
              milestoneId: updated.id,
              orderIndex: updated.order,
            })),
          },
          title: 'Milestones reordered',
          type: TimelineEventType.MILESTONES_REORDERED,
        },
        tx,
      );

      return {
        data: updatedMilestones.map((updated) =>
          this.mapMilestoneToResponse(updated),
        ),
      };
    });
  }

  // AR: يعرض مرحلة واحدة بعد التحقق من ملكية الاتفاق الأب.
  // EN: Returns one milestone after confirming ownership of the parent agreement.
  async getMilestone(id: string, userId: string) {
    const requiredUserId = this.getRequiredUserId(userId);
    const milestone = await this.findOwnedMilestoneWithAgreement(
      id,
      requiredUserId,
    );

    return {
      data: this.mapMilestoneToResponse(milestone),
    };
  }

  // AR: يعرض جميع مراحل الاتفاق المملوك مرتبة مع ملخص الإجمالي.
  // EN: Returns all owned agreement milestones ordered with the amount summary.
  async getAgreementMilestones(agreementId: string, userId: string) {
    const requiredUserId = this.getRequiredUserId(userId);
    const agreement = await this.findOwnedAgreement(
      agreementId,
      requiredUserId,
    );
    const milestones = await this.prisma.milestone.findMany({
      where: { agreementId: agreement.id },
      orderBy: { order: 'asc' },
    });
    const summary = await this.calculateAmountSummary(
      agreement.id,
      agreement.totalAmount,
      agreement.currency,
    );

    return {
      milestones: milestones.map((milestone) =>
        this.mapMilestoneToResponse(milestone),
      ),
      totalAmount: summary.totalAmount,
      agreementTotalAmount: summary.agreementTotalAmount,
      amountMatch: summary.amountMatch,
      currency: summary.currency,
    };
  }

  private getRequiredUserId(userId?: string): string {
    if (!userId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    return userId;
  }

  private parseMoney(amount: string): Prisma.Decimal {
    try {
      const parsed = new Prisma.Decimal(amount);

      if (parsed.lte(0)) {
        throw new Error('Amount must be greater than zero');
      }

      return parsed;
    } catch {
      throw new AppException({ code: ErrorCode.MILESTONE_INVALID_AMOUNT });
    }
  }

  private normalizeAcceptanceCriteria(
    criteria: AcceptanceCriterionDto[],
  ): Array<{ description: string; required: boolean }> {
    return criteria.map((criterion) => ({
      description: criterion.description.trim(),
      required: criterion.required ?? true,
    }));
  }

  private mapMilestoneToResponse(milestone: {
    acceptanceCriteria: Prisma.JsonValue;
    agreementId: string;
    amount: Prisma.Decimal | string | number;
    createdAt: Date;
    currency: string;
    deliveryStatus: DeliveryStatus;
    description: string | null;
    dueDate: Date | null;
    id: string;
    order: number;
    paymentStatus: PaymentStatus;
    revisionLimit: number;
    status: MilestoneStatus;
    title: string;
    updatedAt: Date;
  }) {
    return {
      acceptanceCriteria: this.readAcceptanceCriteria(
        milestone.acceptanceCriteria,
      ),
      agreementId: milestone.agreementId,
      amount: new Prisma.Decimal(milestone.amount).toFixed(2),
      createdAt: milestone.createdAt.toISOString(),
      currency: milestone.currency,
      deliveryStatus: milestone.deliveryStatus,
      description: milestone.description,
      dueDate: milestone.dueDate?.toISOString() ?? null,
      id: milestone.id,
      orderIndex: milestone.order,
      paymentStatus: milestone.paymentStatus,
      revisionLimit: milestone.revisionLimit,
      status: milestone.status,
      title: milestone.title,
      updatedAt: milestone.updatedAt.toISOString(),
    };
  }

  private async findOwnedAgreement(
    agreementId: string,
    userId: string,
    tx?: TransactionClient,
  ): Promise<AgreementRecord> {
    const client = tx ?? this.prisma;
    const agreement = await client.agreement.findFirst({
      where: {
        id: agreementId,
        freelancerId: userId,
      },
    });

    if (!agreement) {
      throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    }

    return agreement;
  }

  // AR: يحصر تعديل المراحل في حالات الاتفاق القابلة للتعديل؛ المخطط الحالي يدعم DRAFT فقط.
  // EN: Restricts milestone mutations to modifiable agreement states; the current schema supports DRAFT only.
  private ensureAgreementModifiable(agreement: AgreementRecord): void {
    if (!MODIFIABLE_AGREEMENT_STATUSES.has(agreement.status)) {
      throw new AppException({ code: ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED });
    }
  }

  private async assertOrderAvailable(
    agreementId: string,
    orderIndex: number,
    tx?: TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    const existingMilestone = await client.milestone.findFirst({
      where: {
        agreementId,
        order: orderIndex,
      },
    });

    if (existingMilestone) {
      throw new AppException({ code: ErrorCode.MILESTONE_INVALID_ORDER });
    }
  }

  private async calculateAmountSummary(
    agreementId: string,
    agreementTotalAmount: Prisma.Decimal,
    currency: string,
    tx?: TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    const aggregate = await client.milestone.aggregate({
      where: { agreementId },
      _sum: { amount: true },
    });
    const totalAmountDecimal = aggregate._sum.amount ?? new Prisma.Decimal(0);
    const amountMatch = totalAmountDecimal.equals(agreementTotalAmount);

    return {
      agreementTotalAmount: agreementTotalAmount.toFixed(2),
      amountMatch,
      amountWarning: amountMatch ? undefined : AMOUNT_WARNING_MESSAGE,
      currency,
      totalAmount: totalAmountDecimal.toFixed(2),
    };
  }

  private async findOwnedMilestoneWithAgreement(
    id: string,
    userId: string,
    tx?: TransactionClient,
  ): Promise<MilestoneWithAgreement> {
    const client = tx ?? this.prisma;
    const milestone = await client.milestone.findFirst({
      where: {
        id,
        agreement: {
          freelancerId: userId,
        },
      },
      include: {
        agreement: true,
      },
    });

    if (!milestone) {
      throw new AppException({ code: ErrorCode.MILESTONE_NOT_FOUND });
    }

    return milestone;
  }

  private buildMilestoneUpdateData(
    dto: UpdateMilestoneDto,
  ): Prisma.MilestoneUpdateInput {
    const data: Prisma.MilestoneUpdateInput = {};

    if (Object.prototype.hasOwnProperty.call(dto, 'title')) {
      data.title = dto.title;
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'description')) {
      data.description = dto.description;
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'dueDate')) {
      data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }

    if (
      Object.prototype.hasOwnProperty.call(dto, 'amount') &&
      dto.amount !== undefined
    ) {
      data.amount = this.parseMoney(dto.amount);
    }

    if (
      Object.prototype.hasOwnProperty.call(dto, 'acceptanceCriteria') &&
      dto.acceptanceCriteria
    ) {
      data.acceptanceCriteria = this.normalizeAcceptanceCriteria(
        dto.acceptanceCriteria,
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(dto, 'revisionLimit') &&
      dto.revisionLimit !== undefined
    ) {
      data.revisionLimit = dto.revisionLimit;
    }

    return data;
  }

  private readAcceptanceCriteria(
    value: Prisma.JsonValue,
  ): Array<{ description: string; required: boolean }> {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item) => typeof item === 'object' && item !== null)
      .map((item) => {
        const criterion = item as Record<string, unknown>;

        return {
          description:
            typeof criterion.description === 'string'
              ? criterion.description
              : '',
          required:
            typeof criterion.required === 'boolean' ? criterion.required : true,
        };
      });
  }

  private buildMilestoneTimelineMetadata(milestone: {
    amount: Prisma.Decimal | string | number;
    currency: string;
    id: string;
    order: number;
    status: MilestoneStatus;
    title: string;
  }): Record<string, unknown> {
    return {
      amount: new Prisma.Decimal(milestone.amount).toFixed(2),
      currency: milestone.currency,
      milestoneId: milestone.id,
      orderIndex: milestone.order,
      status: milestone.status,
      title: milestone.title,
    };
  }

  private getChangedFields(dto: UpdateMilestoneDto): string[] {
    return [
      'title',
      'description',
      'amount',
      'dueDate',
      'acceptanceCriteria',
      'revisionLimit',
    ].filter(
      (field) =>
        Object.prototype.hasOwnProperty.call(dto, field) &&
        dto[field as keyof UpdateMilestoneDto] !== undefined,
    );
  }

  private validateReorderPayload(dto: ReorderMilestonesDto): ReorderItem[] {
    const items = dto.milestones ?? [];

    if (items.length === 0) {
      this.throwInvalidOrder();
    }

    const seenIds = new Set<string>();
    const seenOrders = new Set<number>();

    for (const item of items) {
      if (seenIds.has(item.milestoneId)) {
        this.throwInvalidOrder();
      }

      if (seenOrders.has(item.orderIndex)) {
        this.throwInvalidOrder();
      }

      if (!Number.isInteger(item.orderIndex) || item.orderIndex < 1) {
        this.throwInvalidOrder();
      }

      seenIds.add(item.milestoneId);
      seenOrders.add(item.orderIndex);
    }

    const sortedOrders = Array.from(seenOrders).sort((a, b) => a - b);

    for (let index = 0; index < sortedOrders.length; index += 1) {
      if (sortedOrders[index] !== index + 1) {
        this.throwInvalidOrder();
      }
    }

    return items;
  }

  private assertReorderMatchesAgreement(
    milestones: Array<{ id: string }>,
    items: ReorderItem[],
  ) {
    if (milestones.length !== items.length) {
      this.throwInvalidOrder();
    }

    const milestoneIds = new Set(milestones.map((milestone) => milestone.id));

    for (const item of items) {
      if (!milestoneIds.has(item.milestoneId)) {
        this.throwInvalidOrder();
      }
    }
  }

  private throwInvalidOrder(): never {
    throw new AppException({ code: ErrorCode.MILESTONE_INVALID_ORDER });
  }
}
