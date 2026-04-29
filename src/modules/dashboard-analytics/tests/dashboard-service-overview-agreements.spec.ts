import { AgreementStatus } from '@prisma/client';
import {
  buildMixedStatusesScenario,
  createDashboardService,
} from './dashboard-service-test-helpers';

describe('dashboard overview agreement summary', () => {
  it('returns owned agreement summary counts and excludes unrelated freelancers', async () => {
    const { service, prisma } = createDashboardService();

    (prisma.agreement.groupBy as jest.Mock).mockResolvedValue([
      { status: AgreementStatus.ACTIVE, _count: { _all: 2 } },
      { status: AgreementStatus.APPROVED, _count: { _all: 1 } },
      { status: AgreementStatus.COMPLETED, _count: { _all: 3 } },
      { status: AgreementStatus.DISPUTED, _count: { _all: 1 } },
      { status: AgreementStatus.DRAFT, _count: { _all: 2 } },
      { status: AgreementStatus.SENT, _count: { _all: 1 } },
    ]);
    (prisma.payment.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.aIReview.groupBy as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.changeRequest.groupBy as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.client.count as jest.Mock).mockResolvedValue(2);
    (prisma.delivery.count as jest.Mock).mockResolvedValue(0);

    const result = await service.getOverview({ range: '30d' });

    expect(result.agreementSummary).toEqual({
      total: 10,
      active: 3,
      completed: 3,
      disputed: 1,
      draftOrSent: 3,
      byStatus: {
        ACTIVE: 2,
        APPROVED: 1,
        COMPLETED: 3,
        DISPUTED: 1,
        DRAFT: 2,
        SENT: 1,
      },
    });
    expect(prisma.agreement.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ freelancerId: 'freelancer-1' }),
      }),
    );
  });

  it('returns exact counts for each AgreementStatus from the mixed-statuses fixture (FR-001)', async () => {
    const { service, prisma } = createDashboardService();
    const fixture = buildMixedStatusesScenario();

    const agreementRows = fixture.agreements.map((a) => ({
      status: a.status,
      _count: { _all: 1 },
    }));

    (prisma.agreement.groupBy as jest.Mock).mockResolvedValue(agreementRows);
    (prisma.payment.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.aIReview.groupBy as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.changeRequest.groupBy as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.client.count as jest.Mock).mockResolvedValue(1);
    (prisma.delivery.count as jest.Mock).mockResolvedValue(2);

    const result = await service.getOverview({ range: 'all' });

    expect(result.agreementSummary.total).toBe(4);
    expect(result.agreementSummary.byStatus[AgreementStatus.DRAFT]).toBe(1);
    expect(result.agreementSummary.byStatus[AgreementStatus.SENT]).toBe(1);
    expect(result.agreementSummary.byStatus[AgreementStatus.ACTIVE]).toBe(1);
    expect(result.agreementSummary.byStatus[AgreementStatus.DISPUTED]).toBe(1);
    expect(result.agreementSummary.active).toBe(1);
    expect(result.agreementSummary.draftOrSent).toBe(2);
    expect(result.agreementSummary.disputed).toBe(1);
  });
});
