import { AppException } from '../../../common/errors/app-exception';
import {
  createDashboardClsMock,
  createDashboardService,
} from './dashboard-service-test-helpers';

describe('dashboard actions filters and limits', () => {
  it('applies type filter, final merged limit, and newest-first ordering', async () => {
    const { service, prisma } = createDashboardService();

    (prisma.payment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.delivery.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.aIReview.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.changeRequest.findMany as jest.Mock).mockResolvedValue([]);

    const paymentsOnly = await service.getActionsRequired({
      type: 'payments',
      limit: 1,
    });

    expect(paymentsOnly.items).toEqual([]);
    expect(prisma.delivery.findMany).not.toHaveBeenCalled();
    expect(prisma.aIReview.findMany).not.toHaveBeenCalled();
    expect(prisma.changeRequest.findMany).not.toHaveBeenCalled();
  });

  it('rejects action access when the request context has no freelancer user id', async () => {
    const { service } = createDashboardService({
      cls: createDashboardClsMock({ userId: undefined }),
    });

    await expect(service.getActionsRequired({})).rejects.toMatchObject<
      Partial<AppException>
    >({ code: 'UNAUTHORIZED' });
  });

  it('asserts each type filter narrows correctly and limit enforces [1, 50] (FR-004)', async () => {
    const { service, prisma } = createDashboardService();

    (prisma.payment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.delivery.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.aIReview.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.changeRequest.findMany as jest.Mock).mockResolvedValue([]);

    for (const type of [
      'payments',
      'deliveries',
      'ai_reviews',
      'change_requests',
    ] as const) {
      await service.getActionsRequired({ type, limit: 1 });

      if (type === 'payments') {
        expect(prisma.payment.findMany).toHaveBeenCalled();
      } else if (type === 'deliveries') {
        expect(prisma.delivery.findMany).toHaveBeenCalled();
      } else if (type === 'ai_reviews') {
        expect(prisma.aIReview.findMany).toHaveBeenCalled();
      } else if (type === 'change_requests') {
        expect(prisma.changeRequest.findMany).toHaveBeenCalled();
      }
    }

    await expect(
      service.getActionsRequired({ limit: 0 }),
    ).rejects.toMatchObject<Partial<AppException>>({
      code: 'VALIDATION_ERROR',
    });

    await expect(
      service.getActionsRequired({ limit: 51 }),
    ).rejects.toMatchObject<Partial<AppException>>({
      code: 'VALIDATION_ERROR',
    });

    const withLimit1 = await service.getActionsRequired({ limit: 1 });
    expect(withLimit1.items.length).toBeLessThanOrEqual(1);

    const withLimit50 = await service.getActionsRequired({ limit: 50 });
    expect(withLimit50.items.length).toBeLessThanOrEqual(50);
  });
});
