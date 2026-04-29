import { AppException } from '../../../common/errors/app-exception';
import {
  buildEmptyFreelancerScenario,
  createDashboardClsMock,
  createDashboardService,
} from './dashboard-service-test-helpers';

describe('dashboard overview range and empty state', () => {
  it('uses the requested date range in owned overview queries', async () => {
    const { service, prisma } = createDashboardService();

    (prisma.agreement.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.payment.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.aIReview.groupBy as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.changeRequest.groupBy as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.client.count as jest.Mock).mockResolvedValue(0);
    (prisma.delivery.count as jest.Mock).mockResolvedValue(0);

    await service.getOverview({ range: '7d' });

    expect(prisma.agreement.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      }),
    );
  });

  it('returns the documented empty state', async () => {
    const { service, prisma } = createDashboardService();

    (prisma.agreement.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.payment.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.aIReview.groupBy as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.changeRequest.groupBy as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.client.count as jest.Mock).mockResolvedValue(0);
    (prisma.delivery.count as jest.Mock).mockResolvedValue(0);

    const result = await service.getOverview({ range: 'all' });

    expect(result).toEqual({
      range: 'all',
      currency: null,
      metrics: [],
      paymentSummary: [],
      agreementSummary: {
        total: 0,
        active: 0,
        completed: 0,
        disputed: 0,
        draftOrSent: 0,
        byStatus: {},
      },
      aiReviewSummary: {
        total: 0,
        byStatus: {},
        byRecommendation: {},
      },
      changeRequestSummary: {
        total: 0,
        byStatus: {},
        amountsByCurrency: {},
      },
      generatedAt: expect.any(String),
    });
  });

  it('rejects overview access when the request context has no freelancer user id', async () => {
    const { service } = createDashboardService({
      cls: createDashboardClsMock({ userId: undefined }),
    });

    await expect(service.getOverview({ range: '30d' })).rejects.toMatchObject<
      Partial<AppException>
    >({ code: 'UNAUTHORIZED' });
  });

  it('returns a successful, well-formed empty response for an empty freelancer (FR-014)', async () => {
    const { service, prisma } = createDashboardService();
    const fixture = buildEmptyFreelancerScenario();

    (prisma.agreement.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.payment.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.aIReview.groupBy as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.changeRequest.groupBy as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.client.count as jest.Mock).mockResolvedValue(0);
    (prisma.delivery.count as jest.Mock).mockResolvedValue(0);

    const result = await service.getOverview({ range: 'all' });

    expect(result.range).toBe('all');
    expect(result.currency).toBeNull();
    expect(result.metrics).toEqual([]);
    expect(result.paymentSummary).toEqual([]);
    expect(result.agreementSummary).toEqual({
      total: 0,
      active: 0,
      completed: 0,
      disputed: 0,
      draftOrSent: 0,
      byStatus: {},
    });
    expect(result.aiReviewSummary).toEqual({
      total: 0,
      byStatus: {},
      byRecommendation: {},
    });
    expect(result.changeRequestSummary).toEqual({
      total: 0,
      byStatus: {},
      amountsByCurrency: {},
    });
    expect(result.generatedAt).toEqual(expect.any(String));
  });
});
