import { Test } from '@nestjs/testing';
import { AiPlanModule } from '../../modules/ai-plan/ai-plan.module';
import { AiPlanService } from '../../modules/ai-plan/ai-plan.service';
import { GeminiProvider } from '../../modules/ai-plan/gemini.provider';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

const mockPrismaService = {
  aiPlanDraft: { create: jest.fn() },
  agreement: { findFirst: jest.fn() },
};

const mockGeminiProvider = {
  isEnabled: false,
  generateWithRetry: jest.fn(),
};

describe('AiPlanModule', () => {
  it('provides AiPlanService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AiPlanModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(GeminiProvider)
      .useValue(mockGeminiProvider)
      .compile();

    expect(moduleRef).toBeDefined();
    expect(moduleRef.get(AiPlanModule)).toBeInstanceOf(AiPlanModule);

    const service = moduleRef.get(AiPlanService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(AiPlanService);
  });
});
