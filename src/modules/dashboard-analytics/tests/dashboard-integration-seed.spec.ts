/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { DashboardAnalyticsService } from '../dashboard-analytics.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ClsService } from '../../../common/cls/cls.service';
import {
  buildMixedStatusesScenario,
  createDashboardClsMock,
} from './dashboard-service-test-helpers';
import { serializeDashboardMoney } from '../utils/dashboard-money.util';

describe('dashboard integration seed scenario', () => {
  let service: DashboardAnalyticsService;

  beforeAll(async () => {
    const fixture = buildMixedStatusesScenario();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardAnalyticsService,
        {
          provide: PrismaService,
          useValue: {
            agreement: {
              groupBy: jest
                .fn()
                .mockImplementation(
                  ({ where }: { where: { freelancerId: string } }) => {
                    const filtered = fixture.agreements.filter(
                      (a) => a.freelancerId === where.freelancerId,
                    );
                    return Promise.resolve(
                      filtered.map((a) => ({
                        status: a.status,
                        _count: { _all: 1 },
                      })),
                    );
                  },
                ),
              findFirst: jest
                .fn()
                .mockImplementation(
                  ({
                    where,
                  }: {
                    where: { id: string; freelancerId: string };
                  }) => {
                    const found = fixture.agreements.find(
                      (a) =>
                        a.id === where.id &&
                        a.freelancerId === where.freelancerId,
                    );
                    return Promise.resolve(found ?? null);
                  },
                ),
            },
            payment: {
              groupBy: jest.fn().mockImplementation(({ where }) => {
                const agreementIds = fixture.agreements
                  .filter(
                    (a) => a.freelancerId === where.agreement.freelancerId,
                  )
                  .map((a) => a.id);
                const filtered = fixture.payments.filter(
                  (p) =>
                    agreementIds.includes(p.agreementId) &&
                    (!where.currency || p.currency === where.currency) &&
                    p.demoMode === true,
                );
                return Promise.resolve(
                  filtered.map((p) => ({
                    currency: p.currency,
                    status: p.status,
                    _sum: { amount: p.amount },
                  })),
                );
              }),
              findMany: jest.fn().mockImplementation(({ where }) => {
                const agreementIds = fixture.agreements
                  .filter(
                    (a) => a.freelancerId === where.agreement.freelancerId,
                  )
                  .map((a) => a.id);
                const filtered = fixture.payments.filter(
                  (p) =>
                    agreementIds.includes(p.agreementId) &&
                    p.status === where.status &&
                    p.demoMode === true,
                );
                return Promise.resolve(
                  filtered.map((p) => ({
                    id: p.id,
                    status: p.status,
                    amount: p.amount,
                    currency: p.currency,
                    createdAt: p.createdAt,
                    agreement: { id: p.agreementId, title: 'Test Agreement' },
                  })),
                );
              }),
            },
            client: {
              count: jest.fn().mockResolvedValue(1),
            },
            delivery: {
              count: jest.fn().mockImplementation(({ where }) => {
                const agreementIds = fixture.agreements
                  .filter(
                    (a) => a.freelancerId === where.agreement.freelancerId,
                  )
                  .map((a) => a.id);
                const count = fixture.deliveries.filter(
                  (d) =>
                    agreementIds.includes(d.agreementId) &&
                    d.status === where.status,
                ).length;
                return Promise.resolve(count);
              }),
              findMany: jest.fn().mockImplementation(({ where }) => {
                const agreementIds = fixture.agreements
                  .filter(
                    (a) => a.freelancerId === where.agreement.freelancerId,
                  )
                  .map((a) => a.id);
                const filtered = fixture.deliveries.filter(
                  (d) =>
                    agreementIds.includes(d.agreementId) &&
                    d.status === where.status,
                );
                return Promise.resolve(
                  filtered.map((d) => ({
                    id: d.id,
                    status: d.status,
                    createdAt: d.createdAt,
                    agreement: { id: d.agreementId, title: 'Test Agreement' },
                  })),
                );
              }),
            },
            aIReview: {
              groupBy: jest.fn().mockImplementation(({ where, by }) => {
                const agreementIds = fixture.agreements
                  .filter(
                    (a) => a.freelancerId === where.agreement.freelancerId,
                  )
                  .map((a) => a.id);
                const filtered = fixture.aiReviews.filter((r) =>
                  agreementIds.includes(r.agreementId),
                );
                const grouped = new Map<string, number>();
                for (const r of filtered) {
                  const key = by[0] === 'status' ? r.status : r.recommendation;
                  grouped.set(key, (grouped.get(key) ?? 0) + 1);
                }
                return Promise.resolve(
                  Array.from(grouped.entries()).map(([key, count]) => ({
                    [by[0]]: key,
                    _count: { _all: count },
                  })),
                );
              }),
              findMany: jest.fn().mockImplementation(({ where }) => {
                const agreementIds = fixture.agreements
                  .filter(
                    (a) => a.freelancerId === where.agreement.freelancerId,
                  )
                  .map((a) => a.id);
                const filtered = fixture.aiReviews.filter((r) => {
                  const matchesAgreement = agreementIds.includes(r.agreementId);
                  const matchesStatus =
                    !where.status || r.status === where.status;
                  const matchesRecommendation =
                    !where.recommendation ||
                    !where.recommendation.in ||
                    where.recommendation.in.includes(r.recommendation);
                  return (
                    matchesAgreement && matchesStatus && matchesRecommendation
                  );
                });
                return Promise.resolve(
                  filtered.map((r) => ({
                    id: r.id,
                    status: r.status,
                    recommendation: r.recommendation,
                    createdAt: r.createdAt,
                    agreement: { id: r.agreementId, title: 'Test Agreement' },
                  })),
                );
              }),
            },
            changeRequest: {
              groupBy: jest.fn().mockImplementation(({ where, by }) => {
                const agreementIds = fixture.agreements
                  .filter(
                    (a) => a.freelancerId === where.agreement.freelancerId,
                  )
                  .map((a) => a.id);
                const filtered = fixture.changeRequests.filter((c) =>
                  agreementIds.includes(c.agreementId),
                );
                if (by[0] === 'status') {
                  const grouped = new Map<string, number>();
                  for (const c of filtered) {
                    grouped.set(c.status, (grouped.get(c.status) ?? 0) + 1);
                  }
                  return Promise.resolve(
                    Array.from(grouped.entries()).map(([key, count]) => ({
                      status: key,
                      _count: { _all: count },
                    })),
                  );
                }
                if (by[0] === 'currency') {
                  const grouped = new Map<string, Prisma.Decimal>();
                  for (const c of filtered) {
                    const current =
                      grouped.get(c.currency) ?? new Prisma.Decimal(0);
                    grouped.set(c.currency, current.plus(c.amount));
                  }
                  return Promise.resolve(
                    Array.from(grouped.entries()).map(([key, amount]) => ({
                      currency: key,
                      _sum: { amount },
                    })),
                  );
                }
                return Promise.resolve([]);
              }),
              findMany: jest.fn().mockImplementation(({ where }) => {
                const agreementIds = fixture.agreements
                  .filter(
                    (a) => a.freelancerId === where.agreement.freelancerId,
                  )
                  .map((a) => a.id);
                const filtered = fixture.changeRequests.filter(
                  (c) =>
                    agreementIds.includes(c.agreementId) &&
                    c.status === where.status &&
                    c.requestedByRole === where.requestedByRole,
                );
                return Promise.resolve(
                  filtered.map((c) => ({
                    id: c.id,
                    status: c.status,
                    amount: c.amount,
                    currency: c.currency,
                    createdAt: c.createdAt,
                    agreement: { id: c.agreementId, title: 'Test Agreement' },
                    requestedByRole: c.requestedByRole,
                  })),
                );
              }),
            },
            timelineEvent: {
              findMany: jest.fn().mockImplementation(({ where, take }) => {
                const agreementIds = fixture.agreements
                  .filter(
                    (a) => a.freelancerId === where.agreement.freelancerId,
                  )
                  .map((a) => a.id);
                let filtered = fixture.timelineEvents.filter((e) =>
                  agreementIds.includes(e.agreementId),
                );
                if (where.agreementId) {
                  filtered = filtered.filter(
                    (e) => e.agreementId === where.agreementId,
                  );
                }
                if (where.type) {
                  filtered = filtered.filter((e) => e.type === where.type);
                }
                filtered.sort(
                  (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
                );
                const limited = filtered.slice(0, take);
                return Promise.resolve(
                  limited.map((e) => ({
                    id: e.id,
                    agreementId: e.agreementId,
                    type: e.type,
                    title: e.title,
                    description: e.description,
                    actorRole: e.actorRole,
                    metadata: e.metadata ?? null,
                    createdAt: e.createdAt,
                    agreement: { title: 'Test Agreement' },
                  })),
                );
              }),
            },
          },
        },
        {
          provide: ClsService,
          useValue: createDashboardClsMock({
            userId: fixture.freelancers[0].id,
          }),
        },
      ],
    }).compile();

    service = module.get(DashboardAnalyticsService);
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  function buildExpectedOverview(
    fixture: ReturnType<typeof buildMixedStatusesScenario>,
  ) {
    const usdPayments = fixture.payments.filter((p) => p.currency === 'USD');
    const sarPayments = fixture.payments.filter((p) => p.currency === 'SAR');

    const usdProtected = usdPayments
      .filter((p) =>
        [
          'RESERVED',
          'CLIENT_REVIEW',
          'AI_REVIEW',
          'READY_TO_RELEASE',
          'ON_HOLD',
        ].includes(p.status),
      )
      .reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));
    const usdReleased = usdPayments
      .filter((p) => p.status === 'RELEASED')
      .reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));
    const usdPending = usdPayments
      .filter((p) => p.status === 'WAITING')
      .reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));
    const usdReady = usdPayments
      .filter((p) => p.status === 'READY_TO_RELEASE')
      .reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));

    const sarProtected = sarPayments
      .filter((p) =>
        [
          'RESERVED',
          'CLIENT_REVIEW',
          'AI_REVIEW',
          'READY_TO_RELEASE',
          'ON_HOLD',
        ].includes(p.status),
      )
      .reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));
    const sarReleased = sarPayments
      .filter((p) => p.status === 'RELEASED')
      .reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));
    const sarPending = sarPayments
      .filter((p) => p.status === 'WAITING')
      .reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));
    const sarReady = sarPayments
      .filter((p) => p.status === 'READY_TO_RELEASE')
      .reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));

    return {
      range: 'all',
      currency: null,
      metrics: expect.any(Array),
      paymentSummary: [
        {
          currency: 'SAR',
          protectedAmount: serializeDashboardMoney(sarProtected),
          releasedAmount: serializeDashboardMoney(sarReleased),
          pendingAmount: serializeDashboardMoney(sarPending),
          readyToReleaseAmount: serializeDashboardMoney(sarReady),
          byStatus: expect.any(Object),
        },
        {
          currency: 'USD',
          protectedAmount: serializeDashboardMoney(usdProtected),
          releasedAmount: serializeDashboardMoney(usdReleased),
          pendingAmount: serializeDashboardMoney(usdPending),
          readyToReleaseAmount: serializeDashboardMoney(usdReady),
          byStatus: expect.any(Object),
        },
      ],
      agreementSummary: {
        total: 4,
        active: 1,
        completed: 0,
        disputed: 1,
        draftOrSent: 2,
        byStatus: expect.any(Object),
      },
      aiReviewSummary: {
        total: 2,
        byStatus: expect.any(Object),
        byRecommendation: expect.any(Object),
      },
      changeRequestSummary: {
        total: 2,
        byStatus: expect.any(Object),
        amountsByCurrency: expect.any(Object),
      },
      generatedAt: expect.any(String),
    };
  }

  function buildExpectedActions(
    fixture: ReturnType<typeof buildMixedStatusesScenario>,
  ) {
    const paymentActions = fixture.payments
      .filter((p) => p.status === 'READY_TO_RELEASE')
      .map((p) =>
        expect.objectContaining({
          type: 'payments',
          sourceStatus: 'READY_TO_RELEASE',
          amount: serializeDashboardMoney(p.amount),
          currency: p.currency,
        }),
      );

    const deliveryActions = fixture.deliveries
      .filter((d) => d.status === 'CHANGES_REQUESTED')
      .map(() =>
        expect.objectContaining({
          type: 'deliveries',
          sourceStatus: 'CHANGES_REQUESTED',
        }),
      );

    const aiReviewActions = fixture.aiReviews
      .filter(
        (r) =>
          r.status === 'COMPLETED' &&
          ['REJECT', 'PARTIAL', 'NEEDS_HUMAN_REVIEW'].includes(
            r.recommendation,
          ),
      )
      .map((r) =>
        expect.objectContaining({
          type: 'ai_reviews',
          sourceStatus: r.recommendation,
        }),
      );

    const changeRequestActions = fixture.changeRequests
      .filter((c) => c.status === 'PENDING' && c.requestedByRole === 'CLIENT')
      .map((c) =>
        expect.objectContaining({
          type: 'change_requests',
          sourceStatus: 'PENDING',
          amount: serializeDashboardMoney(c.amount),
          currency: c.currency,
        }),
      );

    return {
      items: expect.arrayContaining([
        ...paymentActions,
        ...deliveryActions,
        ...aiReviewActions,
        ...changeRequestActions,
      ]),
    };
  }

  function buildExpectedRecentActivity(
    fixture: ReturnType<typeof buildMixedStatusesScenario>,
  ) {
    const sortedEvents = [...fixture.timelineEvents].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    return {
      items: sortedEvents.slice(0, 10).map((e) =>
        expect.objectContaining({
          id: e.id,
          agreementId: e.agreementId,
          type: e.type,
          title: e.title,
          description: e.description,
          actorRole: e.actorRole,
          createdAt: e.createdAt.toISOString(),
        }),
      ),
    };
  }

  it('calls getOverview for the seeded freelancer and asserts deep-equal to expected overview output (FR-013)', async () => {
    const fixture = buildMixedStatusesScenario();
    const result = await service.getOverview({ range: 'all' });

    expect(result).toEqual(buildExpectedOverview(fixture));
  });

  it('calls getActionsRequired for the seeded freelancer and asserts deep-equal to expected actions output (FR-013)', async () => {
    const fixture = buildMixedStatusesScenario();
    const result = await service.getActionsRequired({ type: 'all', limit: 50 });

    expect(result).toEqual(buildExpectedActions(fixture));
  });

  it('calls getRecentActivity for the seeded freelancer and asserts deep-equal to expected recent-activity output (FR-013)', async () => {
    const fixture = buildMixedStatusesScenario();
    const result = await service.getRecentActivity({ limit: 10 });

    expect(result).toEqual(buildExpectedRecentActivity(fixture));
  });
});
