import { AiPlanService } from '../../modules/ai-plan/ai-plan.service';
import { Prisma } from '@prisma/client';

const mockPrisma = {
  aiPlanDraft: {
    create: jest.fn(),
  },
  agreement: {
    findFirst: jest.fn(),
  },
};

const mockGeminiProvider = {
  isEnabled: false as boolean,
  generateWithRetry: jest.fn(),
};

describe('AiPlanService Integration', () => {
  let service: AiPlanService;

  beforeEach(() => {
    service = new AiPlanService(mockPrisma as any, mockGeminiProvider as any);
    jest.clearAllMocks();
  });

  describe('generatePlan stores one draft', () => {
    it('calls aiPlanDraft.create exactly once for standalone generation', async () => {
      const fakeDraft = {
        id: 'draft-int-1',
        userId: 'user-1',
        input: {},
        output: {},
        rawResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.aiPlanDraft.create.mockResolvedValue(fakeDraft);

      await service.generatePlan(
        {
          projectDescription: 'تطوير نظام إدارة محتوى كامل بواجهة عربية.',
        },
        'user-1',
      );

      expect(mockPrisma.aiPlanDraft.create).toHaveBeenCalledTimes(1);
    });

    it('stores input.source as standalone', async () => {
      const fakeDraft = {
        id: 'draft-int-2',
        userId: 'user-2',
        input: {},
        output: {},
        rawResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.aiPlanDraft.create.mockResolvedValue(fakeDraft);

      await service.generatePlan(
        {
          projectDescription: 'بناء تطبيق سطح مكتب لإدارة المخزون.',
        },
        'user-2',
      );

      const callArgs = mockPrisma.aiPlanDraft.create.mock.calls[0][0];
      expect(callArgs.data.input.source).toBe('standalone');
      expect(callArgs.data.rawResponse).toBe(Prisma.DbNull);
    });
  });

  describe('generatePlanForAgreement blocks missing agreements', () => {
    it('throws when agreement does not belong to user', async () => {
      mockPrisma.agreement.findFirst.mockResolvedValue(null);

      await expect(
        service.generatePlanForAgreement('agreement-1', {} as any, 'user-3'),
      ).rejects.toThrow('Agreement not found.');
    });

    it('does not create a draft when agreement is not found', async () => {
      mockPrisma.agreement.findFirst.mockResolvedValue(null);

      try {
        await service.generatePlanForAgreement('agreement-2', {}, 'user-4');
      } catch {
        // expected
      }

      expect(mockPrisma.aiPlanDraft.create).not.toHaveBeenCalled();
    });

    it('succeeds and creates a draft when agreement is found for user', async () => {
      const fakeDraft = {
        id: 'draft-int-3',
        userId: 'user-5',
        input: { agreementId: 'agreement-3' },
        output: {},
        rawResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.agreement.findFirst.mockResolvedValue({
        id: 'agreement-3',
        freelancerId: 'user-5',
        description: 'وصف الاتفاقية.',
        totalAmount: { toString: () => '20000' } as any,
        currency: 'SAR',
      });
      mockPrisma.aiPlanDraft.create.mockResolvedValue(fakeDraft);

      const result = await service.generatePlanForAgreement(
        'agreement-3',
        {},
        'user-5',
      );

      expect(result).toHaveProperty('id', 'draft-int-3');
      expect(mockPrisma.aiPlanDraft.create).toHaveBeenCalledTimes(1);
    });
  });
});
