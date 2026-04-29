import { MilestonesController } from '../../modules/milestones/milestones.controller';

describe('MilestonesController', () => {
  const user = { id: 'user-1', role: 'FREELANCER' } as const;

  it('passes CurrentUser.id into each milestones service method', async () => {
    const milestonesService = {
      createMilestone: jest.fn().mockResolvedValue(undefined),
      deleteMilestone: jest.fn().mockResolvedValue(undefined),
      getAgreementMilestones: jest.fn().mockResolvedValue(undefined),
      getMilestone: jest.fn().mockResolvedValue(undefined),
      reorderMilestones: jest.fn().mockResolvedValue(undefined),
      updateMilestone: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new MilestonesController(milestonesService as never);

    await controller.createMilestone(
      'agreement-1',
      { title: 'x' } as never,
      user as never,
    );
    await controller.updateMilestone(
      'milestone-1',
      { title: 'y' },
      user as never,
    );
    await controller.deleteMilestone('milestone-1', user as never);
    await controller.getMilestone('milestone-1', user as never);
    await controller.getAgreementMilestones('agreement-1', user as never);
    await controller.reorderMilestones(
      'milestone-1',
      { milestones: [] },
      user as never,
    );

    expect(milestonesService.createMilestone).toHaveBeenCalledWith(
      'agreement-1',
      { title: 'x' },
      'user-1',
    );
    expect(milestonesService.updateMilestone).toHaveBeenCalledWith(
      'milestone-1',
      { title: 'y' },
      'user-1',
    );
    expect(milestonesService.deleteMilestone).toHaveBeenCalledWith(
      'milestone-1',
      'user-1',
    );
    expect(milestonesService.getMilestone).toHaveBeenCalledWith(
      'milestone-1',
      'user-1',
    );
    expect(milestonesService.getAgreementMilestones).toHaveBeenCalledWith(
      'agreement-1',
      'user-1',
    );
    expect(milestonesService.reorderMilestones).toHaveBeenCalledWith(
      'milestone-1',
      { milestones: [] },
      'user-1',
    );
  });

  it('returns each underlying service result without rewriting route or body values', async () => {
    const createResult = { data: { id: 'created' } };
    const updateResult = { data: { id: 'updated' } };
    const deleteResult = { success: true };
    const getResult = { data: { id: 'single' } };
    const listResult = { milestones: [] };
    const reorderResult = { data: [] };
    const milestonesService = {
      createMilestone: jest.fn().mockResolvedValue(createResult),
      deleteMilestone: jest.fn().mockResolvedValue(deleteResult),
      getAgreementMilestones: jest.fn().mockResolvedValue(listResult),
      getMilestone: jest.fn().mockResolvedValue(getResult),
      reorderMilestones: jest.fn().mockResolvedValue(reorderResult),
      updateMilestone: jest.fn().mockResolvedValue(updateResult),
    };
    const controller = new MilestonesController(milestonesService as never);

    await expect(
      controller.createMilestone(
        'agreement-1',
        { title: 'x' } as never,
        user as never,
      ),
    ).resolves.toBe(createResult);
    await expect(
      controller.updateMilestone('milestone-1', { title: 'y' }, user as never),
    ).resolves.toBe(updateResult);
    await expect(
      controller.deleteMilestone('milestone-1', user as never),
    ).resolves.toBe(deleteResult);
    await expect(
      controller.getMilestone('milestone-1', user as never),
    ).resolves.toBe(getResult);
    await expect(
      controller.getAgreementMilestones('agreement-1', user as never),
    ).resolves.toBe(listResult);
    await expect(
      controller.reorderMilestones(
        'milestone-1',
        { milestones: [] },
        user as never,
      ),
    ).resolves.toBe(reorderResult);
  });
});
