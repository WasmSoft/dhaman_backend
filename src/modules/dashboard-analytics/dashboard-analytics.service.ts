import {
  AIRecommendation,
  AIReviewStatus,
  AgreementStatus,
  DeliveryStatus,
  PaymentStatus,
  Prisma,
  TimelineActorRole,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { ClsService } from '../../common/cls/cls.service';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  DashboardActionsQueryDto,
  DashboardOverviewQueryDto,
  DashboardRecentActivityQueryDto,
} from './dto';
import {
  DASHBOARD_ACTION_TYPE_VALUES,
  DASHBOARD_DEFAULT_LIST_LIMIT,
  DASHBOARD_DEFAULT_RANGE,
  DASHBOARD_MAX_LIST_LIMIT,
  DASHBOARD_MIN_LIST_LIMIT,
  DASHBOARD_RANGE_VALUES,
  type DashboardActionRequired,
  type DashboardActionsRequiredResponse,
  type DashboardOverviewResponse,
  type DashboardPaymentSummary,
  type DashboardRange,
  type DashboardRecentActivity,
  type DashboardRecentActivityResponse,
} from './types';
import { serializeDashboardMoney } from './utils/dashboard-money.util';

const PROTECTED_PAYMENT_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.RESERVED,
  PaymentStatus.CLIENT_REVIEW,
  PaymentStatus.AI_REVIEW,
  PaymentStatus.READY_TO_RELEASE,
  PaymentStatus.ON_HOLD,
]);

const AI_ACTION_RECOMMENDATIONS = new Set<AIRecommendation>([
  AIRecommendation.REJECT,
  AIRecommendation.PARTIAL,
  AIRecommendation.NEEDS_HUMAN_REVIEW,
]);

type DecimalLike = Prisma.Decimal | string | number | null | undefined;

@Injectable()
export class DashboardAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clsService: ClsService,
  ) {}

  async getOverview(
    query: DashboardOverviewQueryDto,
  ): Promise<DashboardOverviewResponse> {
    const userId = this.getRequiredUserId();
    const range = this.normalizeRange(query.range);
    const createdAt = this.buildCreatedAtFilter(range);
    const currency = query.currency ?? null;

    return this.wrapDashboardError(async () => {
      const [
        agreementRows,
        paymentRows,
        aiReviewStatusRows,
        aiReviewRecommendationRows,
        changeRequestStatusRows,
        changeRequestAmountRows,
        clientCount,
        deliveriesInReviewCount,
      ] = await Promise.all([
        this.prisma.agreement.groupBy({
          by: ['status'],
          where: {
            freelancerId: userId,
            ...(createdAt ? { createdAt } : {}),
          },
          _count: { _all: true },
        }),
        this.prisma.payment.groupBy({
          by: ['currency', 'status'],
          where: {
            demoMode: true,
            agreement: { freelancerId: userId },
            ...(currency ? { currency } : {}),
            ...(createdAt ? { createdAt } : {}),
          },
          _sum: { amount: true },
        }),
        this.prisma.aIReview.groupBy({
          by: ['status'],
          where: {
            agreement: { freelancerId: userId },
            ...(createdAt ? { createdAt } : {}),
          },
          _count: { _all: true },
        }),
        this.prisma.aIReview.groupBy({
          by: ['recommendation'],
          where: {
            agreement: { freelancerId: userId },
            ...(createdAt ? { createdAt } : {}),
          },
          _count: { _all: true },
        }),
        this.prisma.changeRequest.groupBy({
          by: ['status'],
          where: {
            agreement: { freelancerId: userId },
            ...(createdAt ? { createdAt } : {}),
          },
          _count: { _all: true },
        }),
        this.prisma.changeRequest.groupBy({
          by: ['currency'],
          where: {
            agreement: { freelancerId: userId },
            ...(currency ? { currency } : {}),
            ...(createdAt ? { createdAt } : {}),
          },
          _sum: { amount: true },
        }),
        this.prisma.client.count({
          where: {
            freelancerId: userId,
            ...(createdAt ? { createdAt } : {}),
          },
        }),
        this.prisma.delivery.count({
          where: {
            agreement: { freelancerId: userId },
            status: DeliveryStatus.IN_REVIEW,
            ...(createdAt ? { createdAt } : {}),
          },
        }),
      ]);

      const agreementSummary = this.buildAgreementSummary(agreementRows);
      const paymentSummary = this.buildPaymentSummary(paymentRows);
      const aiReviewSummary = this.buildAiReviewSummary(
        aiReviewStatusRows,
        aiReviewRecommendationRows,
      );
      const changeRequestSummary = this.buildChangeRequestSummary(
        changeRequestStatusRows,
        changeRequestAmountRows,
      );

      const hasData =
        agreementSummary.total > 0 ||
        paymentSummary.length > 0 ||
        aiReviewSummary.total > 0 ||
        changeRequestSummary.total > 0 ||
        clientCount > 0 ||
        deliveriesInReviewCount > 0;

      return {
        range,
        currency,
        metrics: hasData
          ? this.buildOverviewMetrics(
              paymentSummary,
              agreementSummary.active,
              clientCount,
              deliveriesInReviewCount,
              changeRequestSummary.byStatus.PENDING ?? 0,
            )
          : [],
        paymentSummary,
        agreementSummary,
        aiReviewSummary,
        changeRequestSummary,
        generatedAt: this.getGeneratedAt(),
      };
    });
  }

  async getActionsRequired(
    query: DashboardActionsQueryDto,
  ): Promise<DashboardActionsRequiredResponse> {
    const userId = this.getRequiredUserId();
    const limit = this.normalizeLimit(query.limit);
    const type = query.type ?? 'all';

    return this.wrapDashboardError(async () => {
      const includeAll = type === 'all';
      const tasks = [
        includeAll || type === 'payments'
          ? this.prisma.payment.findMany({
              where: {
                demoMode: true,
                status: PaymentStatus.READY_TO_RELEASE,
                agreement: { freelancerId: userId },
              },
              orderBy: { createdAt: 'desc' },
              take: limit,
              select: {
                id: true,
                status: true,
                amount: true,
                currency: true,
                createdAt: true,
                agreement: { select: { id: true, title: true } },
              },
            })
          : Promise.resolve([]),
        includeAll || type === 'deliveries'
          ? this.prisma.delivery.findMany({
              where: {
                status: DeliveryStatus.CHANGES_REQUESTED,
                agreement: { freelancerId: userId },
              },
              orderBy: { createdAt: 'desc' },
              take: limit,
              select: {
                id: true,
                status: true,
                createdAt: true,
                agreement: { select: { id: true, title: true } },
              },
            })
          : Promise.resolve([]),
        includeAll || type === 'ai_reviews'
          ? this.prisma.aIReview.findMany({
              where: {
                status: AIReviewStatus.COMPLETED,
                recommendation: {
                  in: [
                    AIRecommendation.REJECT,
                    AIRecommendation.PARTIAL,
                    AIRecommendation.NEEDS_HUMAN_REVIEW,
                  ],
                },
                agreement: { freelancerId: userId },
              },
              orderBy: { createdAt: 'desc' },
              take: limit,
              select: {
                id: true,
                status: true,
                recommendation: true,
                createdAt: true,
                agreement: { select: { id: true, title: true } },
              },
            })
          : Promise.resolve([]),
        includeAll || type === 'change_requests'
          ? this.prisma.changeRequest.findMany({
              where: {
                requestedByRole: TimelineActorRole.CLIENT,
                status: 'PENDING',
                agreement: { freelancerId: userId },
              },
              orderBy: { createdAt: 'desc' },
              take: limit,
              select: {
                id: true,
                status: true,
                amount: true,
                currency: true,
                createdAt: true,
                agreement: { select: { id: true, title: true } },
              },
            })
          : Promise.resolve([]),
      ] as const;

      const [payments, deliveries, aiReviews, changeRequests] =
        await Promise.all(tasks);

      const items = [
        ...payments.map<DashboardActionRequired>((payment) => ({
          id: `payment:${payment.id}`,
          type: 'payments' as const,
          title: 'Payment ready to release',
          description:
            'Review the completed milestone and release the protected payment.',
          agreementId: payment.agreement.id,
          agreementTitle: payment.agreement.title,
          sourceId: payment.id,
          sourceStatus: payment.status,
          amount: serializeDashboardMoney(payment.amount),
          currency: payment.currency,
          createdAt: payment.createdAt.toISOString(),
          priority: 'high' as const,
        })),
        ...deliveries.map<DashboardActionRequired>((delivery) => ({
          id: `delivery:${delivery.id}`,
          type: 'deliveries' as const,
          title: 'Delivery changes requested',
          description:
            'Review the client feedback and prepare an updated delivery submission.',
          agreementId: delivery.agreement.id,
          agreementTitle: delivery.agreement.title,
          sourceId: delivery.id,
          sourceStatus: delivery.status,
          amount: null,
          currency: null,
          createdAt: delivery.createdAt.toISOString(),
          priority: 'high' as const,
        })),
        ...aiReviews.map<DashboardActionRequired>((review) => ({
          id: `ai_review:${review.id}`,
          type: 'ai_reviews' as const,
          title: 'AI review needs attention',
          description:
            'Review the AI recommendation and decide the next freelancer action.',
          agreementId: review.agreement.id,
          agreementTitle: review.agreement.title,
          sourceId: review.id,
          sourceStatus: review.recommendation,
          amount: null,
          currency: null,
          createdAt: review.createdAt.toISOString(),
          priority: 'normal' as const,
        })),
        ...changeRequests.map<DashboardActionRequired>((changeRequest) => ({
          id: `change_request:${changeRequest.id}`,
          type: 'change_requests' as const,
          title: 'Change request pending response',
          description:
            'Review the client change request and decide whether to proceed.',
          agreementId: changeRequest.agreement.id,
          agreementTitle: changeRequest.agreement.title,
          sourceId: changeRequest.id,
          sourceStatus: changeRequest.status,
          amount: serializeDashboardMoney(changeRequest.amount),
          currency: changeRequest.currency,
          createdAt: changeRequest.createdAt.toISOString(),
          priority: 'normal' as const,
        })),
      ]
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
        )
        .slice(0, limit);

      return { items };
    });
  }

  async getRecentActivity(
    query: DashboardRecentActivityQueryDto,
  ): Promise<DashboardRecentActivityResponse> {
    const userId = this.getRequiredUserId();
    const limit = this.normalizeLimit(query.limit);

    return this.wrapDashboardError(async () => {
      if (query.agreementId) {
        const agreement = await this.prisma.agreement.findFirst({
          where: {
            id: query.agreementId,
            freelancerId: userId,
          },
          select: { id: true },
        });

        if (!agreement) {
          throw new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
        }
      }

      const rows = await this.prisma.timelineEvent.findMany({
        where: {
          agreement: { freelancerId: userId },
          ...(query.agreementId ? { agreementId: query.agreementId } : {}),
          ...(query.type ? { type: query.type } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          agreementId: true,
          type: true,
          title: true,
          description: true,
          actorRole: true,
          metadata: true,
          createdAt: true,
          agreement: { select: { title: true } },
        },
      });

      const items = rows.map<DashboardRecentActivity>((row) => ({
        id: row.id,
        agreementId: row.agreementId,
        agreementTitle: row.agreement.title,
        type: row.type,
        title: row.title,
        description: row.description,
        actorRole: row.actorRole,
        createdAt: row.createdAt.toISOString(),
        metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      }));

      return { items };
    });
  }

  private buildAgreementSummary(
    rows: Array<{ status: AgreementStatus; _count: { _all: number } }>,
  ): DashboardOverviewResponse['agreementSummary'] {
    const byStatus = rows.reduce<Record<string, number>>((result, row) => {
      result[row.status] = row._count._all;
      return result;
    }, {});

    const total = rows.reduce((sum, row) => sum + row._count._all, 0);

    return {
      total,
      active:
        (byStatus[AgreementStatus.ACTIVE] ?? 0) +
        (byStatus[AgreementStatus.APPROVED] ?? 0),
      completed: byStatus[AgreementStatus.COMPLETED] ?? 0,
      disputed: byStatus[AgreementStatus.DISPUTED] ?? 0,
      draftOrSent:
        (byStatus[AgreementStatus.DRAFT] ?? 0) +
        (byStatus[AgreementStatus.SENT] ?? 0),
      byStatus,
    };
  }

  private buildPaymentSummary(
    rows: Array<{
      currency: string;
      status: PaymentStatus;
      _sum: { amount: Prisma.Decimal | null };
    }>,
  ): DashboardPaymentSummary[] {
    const summaryByCurrency = new Map<
      string,
      {
        protectedAmount: Prisma.Decimal;
        releasedAmount: Prisma.Decimal;
        pendingAmount: Prisma.Decimal;
        readyToReleaseAmount: Prisma.Decimal;
        byStatus: Record<string, Prisma.Decimal>;
      }
    >();

    for (const row of rows) {
      const currencySummary = summaryByCurrency.get(row.currency) ?? {
        protectedAmount: new Prisma.Decimal(0),
        releasedAmount: new Prisma.Decimal(0),
        pendingAmount: new Prisma.Decimal(0),
        readyToReleaseAmount: new Prisma.Decimal(0),
        byStatus: {},
      };

      const amount = this.toDecimal(row._sum.amount);
      currencySummary.byStatus[row.status] = this.toDecimal(
        currencySummary.byStatus[row.status],
      ).plus(amount);

      if (PROTECTED_PAYMENT_STATUSES.has(row.status)) {
        currencySummary.protectedAmount =
          currencySummary.protectedAmount.plus(amount);
      }

      if (row.status === PaymentStatus.RELEASED) {
        currencySummary.releasedAmount =
          currencySummary.releasedAmount.plus(amount);
      }

      if (row.status === PaymentStatus.WAITING) {
        currencySummary.pendingAmount =
          currencySummary.pendingAmount.plus(amount);
      }

      if (row.status === PaymentStatus.READY_TO_RELEASE) {
        currencySummary.readyToReleaseAmount =
          currencySummary.readyToReleaseAmount.plus(amount);
      }

      summaryByCurrency.set(row.currency, currencySummary);
    }

    return [...summaryByCurrency.entries()].map(([currency, summary]) => ({
      currency,
      protectedAmount: serializeDashboardMoney(summary.protectedAmount),
      releasedAmount: serializeDashboardMoney(summary.releasedAmount),
      pendingAmount: serializeDashboardMoney(summary.pendingAmount),
      readyToReleaseAmount: serializeDashboardMoney(
        summary.readyToReleaseAmount,
      ),
      byStatus: Object.fromEntries(
        Object.entries(summary.byStatus).map(([status, amount]) => [
          status,
          serializeDashboardMoney(amount),
        ]),
      ),
    }));
  }

  private buildAiReviewSummary(
    statusRows: Array<{ status: AIReviewStatus; _count: { _all: number } }>,
    recommendationRows: Array<{
      recommendation: AIRecommendation;
      _count: { _all: number };
    }>,
  ): DashboardOverviewResponse['aiReviewSummary'] {
    const byStatus = statusRows.reduce<Record<string, number>>(
      (result, row) => {
        result[row.status] = row._count._all;
        return result;
      },
      {},
    );

    const byRecommendation = recommendationRows.reduce<Record<string, number>>(
      (result, row) => {
        result[row.recommendation] = row._count._all;
        return result;
      },
      {},
    );

    return {
      total: statusRows.reduce((sum, row) => sum + row._count._all, 0),
      byStatus,
      byRecommendation,
    };
  }

  private buildChangeRequestSummary(
    statusRows: Array<{ status: string; _count: { _all: number } }>,
    amountRows: Array<{
      currency: string;
      _sum: { amount: Prisma.Decimal | null };
    }>,
  ): DashboardOverviewResponse['changeRequestSummary'] {
    const byStatus = statusRows.reduce<Record<string, number>>(
      (result, row) => {
        result[row.status] = row._count._all;
        return result;
      },
      {},
    );

    const amountsByCurrency = Object.fromEntries(
      amountRows.map((row) => [
        row.currency,
        serializeDashboardMoney(row._sum.amount),
      ]),
    );

    return {
      total: statusRows.reduce((sum, row) => sum + row._count._all, 0),
      byStatus,
      amountsByCurrency,
    };
  }

  private buildOverviewMetrics(
    paymentSummary: DashboardPaymentSummary[],
    activeAgreements: number,
    clientCount: number,
    deliveriesInReviewCount: number,
    pendingChangeRequests: number,
  ): DashboardOverviewResponse['metrics'] {
    const protectedAmountMetrics = paymentSummary.map((summary) => ({
      key: `protected_amount_${summary.currency.toLowerCase()}`,
      label: `Protected amount (${summary.currency})`,
      value: summary.protectedAmount,
      valueType: 'money' as const,
      currency: summary.currency,
      status: PaymentStatus.RESERVED,
      trend: null,
    }));

    return [
      ...protectedAmountMetrics,
      {
        key: 'active_agreements',
        label: 'Active agreements',
        value: activeAgreements,
        valueType: 'count' as const,
        currency: null,
        status: AgreementStatus.ACTIVE,
        trend: null,
      },
      {
        key: 'clients_count',
        label: 'Clients',
        value: clientCount,
        valueType: 'count' as const,
        currency: null,
        status: null,
        trend: null,
      },
      {
        key: 'deliveries_in_review',
        label: 'Deliveries in review',
        value: deliveriesInReviewCount,
        valueType: 'count' as const,
        currency: null,
        status: DeliveryStatus.IN_REVIEW,
        trend: null,
      },
      {
        key: 'pending_change_requests',
        label: 'Pending change requests',
        value: pendingChangeRequests,
        valueType: 'count' as const,
        currency: null,
        status: 'PENDING',
        trend: null,
      },
    ];
  }

  private getRequiredUserId(): string {
    const userId = this.clsService.get('userId');

    if (!userId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    return userId;
  }

  private normalizeRange(range?: DashboardRange): DashboardRange {
    if (!range) {
      return DASHBOARD_DEFAULT_RANGE;
    }

    if (!DASHBOARD_RANGE_VALUES.includes(range)) {
      throw new AppException({ code: ErrorCode.DASHBOARD_RANGE_INVALID });
    }

    return range;
  }

  private normalizeLimit(limit?: number): number {
    if (limit === undefined) {
      return DASHBOARD_DEFAULT_LIST_LIMIT;
    }

    if (limit < DASHBOARD_MIN_LIST_LIMIT || limit > DASHBOARD_MAX_LIST_LIMIT) {
      throw new AppException({ code: ErrorCode.VALIDATION_ERROR });
    }

    return limit;
  }

  private buildCreatedAtFilter(
    range: DashboardRange,
  ): { gte: Date } | undefined {
    if (range === 'all') {
      return undefined;
    }

    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - days);
    return { gte: date };
  }

  private getGeneratedAt(): string {
    return new Date().toISOString();
  }

  private toDecimal(value: DecimalLike): Prisma.Decimal {
    if (value instanceof Prisma.Decimal) {
      return value;
    }

    if (value === null || value === undefined) {
      return new Prisma.Decimal(0);
    }

    if (typeof value === 'number') {
      return new Prisma.Decimal(value.toString());
    }

    return new Prisma.Decimal(value);
  }

  private async wrapDashboardError<T>(callback: () => Promise<T>): Promise<T> {
    try {
      return await callback();
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      throw new AppException({ code: ErrorCode.DASHBOARD_AGGREGATION_FAILED });
    }
  }
}
