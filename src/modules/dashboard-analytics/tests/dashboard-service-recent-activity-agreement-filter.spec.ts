import { AppException } from '../../../common/errors/app-exception';
import {
  buildTwoFreelancersOverlapScenario,
  createDashboardService,
  withFreelancerCls,
} from './dashboard-service-test-helpers';
import { Locale } from '../../../common/enums/locale.enum';

describe('dashboard recent activity agreement filter', () => {
  it('checks owned agreement access before returning timeline items', async () => {
    const { service, prisma } = createDashboardService();

    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue({
      id: 'agreement-1',
    });
    (prisma.timelineEvent.findMany as jest.Mock).mockResolvedValue([]);

    await service.getRecentActivity({ agreementId: 'agreement-1', limit: 10 });

    expect(prisma.agreement.findFirst).toHaveBeenCalledWith({
      where: { id: 'agreement-1', freelancerId: 'freelancer-1' },
      select: { id: true },
    });
  });

  it('returns AGREEMENT_NOT_FOUND for missing or inaccessible agreements', async () => {
    const { service, prisma } = createDashboardService();

    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.getRecentActivity({ agreementId: 'agreement-404', limit: 10 }),
    ).rejects.toMatchObject<Partial<AppException>>({
      code: 'AGREEMENT_NOT_FOUND',
    });
    expect(prisma.timelineEvent.findMany).not.toHaveBeenCalled();
  });

  it('unit-level cross-tenant scoping test: service raises AGREEMENT_NOT_FOUND when filtering on B agreement as freelancer A (FR-009)', async () => {
    const fixture = buildTwoFreelancersOverlapScenario();
    const freelancerA = fixture.freelancers[0].id;
    const agreementOwnedByB = fixture.agreements.find(
      (a) => a.freelancerId === fixture.freelancers[1].id,
    )!;

    const { service, prisma } = withFreelancerCls(
      freelancerA,
      Locale.EN,
      (cls) =>
        createDashboardService({
          cls,
        }),
    );

    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.getRecentActivity({
        agreementId: agreementOwnedByB.id,
        limit: 10,
      }),
    ).rejects.toMatchObject<Partial<AppException>>({
      code: 'AGREEMENT_NOT_FOUND',
    });
  });
});
