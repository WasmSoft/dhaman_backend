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

const validPlanJson = JSON.stringify({
  milestones: [
    {
      title: 'Phase 1',
      amount: 4000,
      dueInDays: 7,
      acceptanceCriteria: ['Deliver design', 'Client approval'],
      revisionLimit: 2,
    },
  ],
  policies: {
    delayPolicy: 'Delay policy text',
    cancellationPolicy: 'Cancellation policy text',
    extraRequestPolicy: 'Extra request policy text',
    reviewPolicy: 'Review policy text',
  },
  ambiguityWarnings: ['Timeline unclear'],
  clarityScore: 75,
});

describe('AiPlanService', () => {
  let service: AiPlanService;

  beforeEach(() => {
    service = new AiPlanService(mockPrisma as any, mockGeminiProvider as any);
    jest.clearAllMocks();
    mockGeminiProvider.generateWithRetry.mockReset();
    mockGeminiProvider.isEnabled = false;
  });

  describe('generateMockPlan (US1)', () => {
    it('returns exactly three milestones', () => {
      const result = service.generateMockPlan('any description');

      expect(result.milestones).toHaveLength(3);
    });

    it('each mock milestone has title, amount, dueInDays, acceptanceCriteria, and revisionLimit', () => {
      const result = service.generateMockPlan('any description');

      for (const milestone of result.milestones) {
        expect(typeof milestone.title).toBe('string');
        expect(milestone.title.length).toBeGreaterThan(0);
        expect(typeof milestone.amount).toBe('number');
        expect(typeof milestone.dueInDays).toBe('number');
        expect(Array.isArray(milestone.acceptanceCriteria)).toBe(true);
        expect(milestone.acceptanceCriteria.length).toBeGreaterThan(0);
        expect(typeof milestone.revisionLimit).toBe('number');
      }
    });

    it('mock policies include delayPolicy, cancellationPolicy, extraRequestPolicy, and reviewPolicy', () => {
      const result = service.generateMockPlan('any description');

      expect(typeof result.policies.delayPolicy).toBe('string');
      expect(result.policies.delayPolicy.length).toBeGreaterThan(0);
      expect(typeof result.policies.cancellationPolicy).toBe('string');
      expect(result.policies.cancellationPolicy.length).toBeGreaterThan(0);
      expect(typeof result.policies.extraRequestPolicy).toBe('string');
      expect(result.policies.extraRequestPolicy.length).toBeGreaterThan(0);
      expect(typeof result.policies.reviewPolicy).toBe('string');
      expect(result.policies.reviewPolicy.length).toBeGreaterThan(0);
    });

    it('mock output includes one or two ambiguity warnings and clarity score 75', () => {
      const result = service.generateMockPlan('any description');

      expect(result.ambiguityWarnings.length).toBeGreaterThanOrEqual(1);
      expect(result.ambiguityWarnings.length).toBeLessThanOrEqual(2);
      for (const warning of result.ambiguityWarnings) {
        expect(typeof warning).toBe('string');
        expect(warning.length).toBeGreaterThan(0);
      }
      expect(result.clarityScore).toBe(75);
    });

    it('budget 1000 is split into milestone amounts 400, 300, and 300', () => {
      const result = service.generateMockPlan('any description', 'ar', 1000);

      expect(result.milestones[0].amount).toBe(400);
      expect(result.milestones[1].amount).toBe(300);
      expect(result.milestones[2].amount).toBe(300);
    });

    it('budget 1001 produces milestone amounts that total exactly 1001', () => {
      const result = service.generateMockPlan('any description', 'ar', 1001);

      const total = result.milestones.reduce((sum, m) => sum + m.amount, 0);
      expect(total).toBe(1001);
    });

    it('omitted language returns Arabic text in the first milestone title', () => {
      const result = service.generateMockPlan('any description');

      expect(result.milestones[0].title).toMatch(/[\u0600-\u06FF]/);
    });

    it('language en returns English text in the first milestone title', () => {
      const result = service.generateMockPlan('any description', 'en');

      expect(result.milestones[0].title).toBe('Planning & Analysis Phase');
    });

    it('no budget uses deterministic default amounts', () => {
      const result = service.generateMockPlan('any description');

      expect(result.milestones[0].amount).toBe(4000);
      expect(result.milestones[1].amount).toBe(3000);
      expect(result.milestones[2].amount).toBe(3000);
    });

    it('all four policy fields are non-empty strings in Arabic output', () => {
      const result = service.generateMockPlan('any description', 'ar');

      expect(result.policies.delayPolicy.length).toBeGreaterThan(0);
      expect(result.policies.cancellationPolicy.length).toBeGreaterThan(0);
      expect(result.policies.extraRequestPolicy.length).toBeGreaterThan(0);
      expect(result.policies.reviewPolicy.length).toBeGreaterThan(0);
    });

    it('all four policy fields are non-empty strings in English output', () => {
      const result = service.generateMockPlan('any description', 'en');

      expect(result.policies.delayPolicy.length).toBeGreaterThan(0);
      expect(result.policies.cancellationPolicy.length).toBeGreaterThan(0);
      expect(result.policies.extraRequestPolicy.length).toBeGreaterThan(0);
      expect(result.policies.reviewPolicy.length).toBeGreaterThan(0);
    });

    it('has revisionLimit set for every milestone', () => {
      const result = service.generateMockPlan('any description');

      for (const milestone of result.milestones) {
        expect(typeof milestone.revisionLimit).toBe('number');
        expect(milestone.revisionLimit).toBeGreaterThan(0);
      }
    });

    it('milestone due days are set to deterministic values 7, 14, and 21', () => {
      const result = service.generateMockPlan('any description');

      expect(result.milestones[0].dueInDays).toBe(7);
      expect(result.milestones[1].dueInDays).toBe(14);
      expect(result.milestones[2].dueInDays).toBe(21);
    });
  });

  describe('buildPrompt (US2)', () => {
    it('includes the exact field names milestones, policies, ambiguityWarnings, and clarityScore', () => {
      const prompt = service.buildPrompt(
        'Test project description long enough for validation',
        'ar',
      );

      expect(prompt).toContain('"milestones"');
      expect(prompt).toContain('"policies"');
      expect(prompt).toContain('"ambiguityWarnings"');
      expect(prompt).toContain('"clarityScore"');
    });

    it('says to return structured JSON only and no free text', () => {
      const prompt = service.buildPrompt(
        'Test project description long enough for validation',
        'ar',
      );

      expect(prompt).toContain('Return JSON only');
      expect(prompt).toContain('Do not return markdown');
    });

    it('includes the requested language value ar or en', () => {
      const promptAr = service.buildPrompt(
        'Test project description long enough for validation',
        'ar',
      );

      expect(promptAr).toContain('Arabic');

      const promptEn = service.buildPrompt(
        'Test project description long enough for validation',
        'en',
      );

      expect(promptEn).toContain('English');
    });

    it('includes budget 12000 and currency SAR when both are supplied', () => {
      const prompt = service.buildPrompt(
        'Test project description long enough for validation',
        'ar',
        12000,
        'SAR',
      );

      expect(prompt).toContain('12000');
      expect(prompt).toContain('SAR');
    });

    it('includes simple instruction labels such as Task, Rules, and Output JSON shape for cheaper AI readability', () => {
      const prompt = service.buildPrompt(
        'Test project description long enough for validation',
        'ar',
      );

      expect(prompt).toContain('Task:');
      expect(prompt).toContain('Rules:');
      expect(prompt).toContain('Output JSON shape:');
    });

    it('lists required milestone fields title, amount, dueInDays, acceptanceCriteria, and revisionLimit', () => {
      const prompt = service.buildPrompt(
        'Test project description long enough for validation',
        'ar',
      );

      expect(prompt).toContain('"title"');
      expect(prompt).toContain('"amount"');
      expect(prompt).toContain('"dueInDays"');
      expect(prompt).toContain('"acceptanceCriteria"');
      expect(prompt).toContain('"revisionLimit"');
    });

    it('lists required policy fields delayPolicy, cancellationPolicy, extraRequestPolicy, and reviewPolicy', () => {
      const prompt = service.buildPrompt(
        'Test project description long enough for validation',
        'ar',
      );

      expect(prompt).toContain('"delayPolicy"');
      expect(prompt).toContain('"cancellationPolicy"');
      expect(prompt).toContain('"extraRequestPolicy"');
      expect(prompt).toContain('"reviewPolicy"');
    });

    it('includes project description in the prompt', () => {
      const desc = 'Design an e-commerce website with payment gateway';

      const prompt = service.buildPrompt(desc, 'en');

      expect(prompt).toContain(desc);
    });

    it('instructs to identify ambiguities and assign clarity score from 0 to 100', () => {
      const prompt = service.buildPrompt(
        'Test project description long enough for validation',
        'ar',
      );

      expect(prompt).toContain('clarity score');
      expect(prompt).toContain('0');
      expect(prompt).toContain('100');
    });
  });

  describe('parseAiResponse (US3)', () => {
    it('accepts valid JSON with milestones, policies, ambiguity warnings, and clarity score', () => {
      const result = service.parseAiResponse(validPlanJson);

      expect(result.milestones).toHaveLength(1);
      expect(result.milestones[0].title).toBe('Phase 1');
      expect(result.milestones[0].amount).toBe(4000);
      expect(result.policies.delayPolicy).toBe('Delay policy text');
      expect(result.ambiguityWarnings).toEqual(['Timeline unclear']);
      expect(result.clarityScore).toBe(75);
    });

    it('rejects malformed JSON', () => {
      expect(() => service.parseAiResponse('not json at all')).toThrow(
        'AI returned an invalid response',
      );
    });

    it('rejects output without milestones', () => {
      const noMilestones = JSON.stringify({
        policies: {
          delayPolicy: 'd',
          cancellationPolicy: 'c',
          extraRequestPolicy: 'e',
          reviewPolicy: 'r',
        },
        ambiguityWarnings: [],
        clarityScore: 50,
      });

      expect(() => service.parseAiResponse(noMilestones)).toThrow(
        'AI returned an invalid response',
      );
    });

    it('rejects a milestone without title', () => {
      const noTitle = JSON.stringify({
        milestones: [
          {
            amount: 1000,
            dueInDays: 7,
            acceptanceCriteria: ['Test'],
            revisionLimit: 2,
          },
        ],
        policies: {
          delayPolicy: 'd',
          cancellationPolicy: 'c',
          extraRequestPolicy: 'e',
          reviewPolicy: 'r',
        },
        ambiguityWarnings: [],
        clarityScore: 50,
      });

      expect(() => service.parseAiResponse(noTitle)).toThrow(
        'AI returned an invalid response',
      );
    });

    it('rejects a milestone without acceptanceCriteria', () => {
      const noCriteria = JSON.stringify({
        milestones: [
          {
            title: 'Phase 1',
            amount: 1000,
            dueInDays: 7,
            revisionLimit: 2,
          },
        ],
        policies: {
          delayPolicy: 'd',
          cancellationPolicy: 'c',
          extraRequestPolicy: 'e',
          reviewPolicy: 'r',
        },
        ambiguityWarnings: [],
        clarityScore: 50,
      });

      expect(() => service.parseAiResponse(noCriteria)).toThrow(
        'AI returned an invalid response',
      );
    });

    it('rejects output without all four policy fields', () => {
      const missingPolicy = JSON.stringify({
        milestones: [
          {
            title: 'Phase 1',
            amount: 1000,
            dueInDays: 7,
            acceptanceCriteria: ['Test'],
            revisionLimit: 2,
          },
        ],
        policies: {
          delayPolicy: 'd',
          cancellationPolicy: 'c',
        },
        ambiguityWarnings: [],
        clarityScore: 50,
      });

      expect(() => service.parseAiResponse(missingPolicy)).toThrow(
        'AI returned an invalid response',
      );
    });

    it('rejects non-array ambiguityWarnings', () => {
      const nonArrayWarnings = JSON.stringify({
        milestones: [
          {
            title: 'Phase 1',
            amount: 1000,
            dueInDays: 7,
            acceptanceCriteria: ['Test'],
            revisionLimit: 2,
          },
        ],
        policies: {
          delayPolicy: 'd',
          cancellationPolicy: 'c',
          extraRequestPolicy: 'e',
          reviewPolicy: 'r',
        },
        ambiguityWarnings: 'not an array',
        clarityScore: 50,
      });

      expect(() => service.parseAiResponse(nonArrayWarnings)).toThrow(
        'AI returned an invalid response',
      );
    });

    it('rejects clarityScore below 0', () => {
      const negativeScore = JSON.stringify({
        milestones: [
          {
            title: 'Phase 1',
            amount: 1000,
            dueInDays: 7,
            acceptanceCriteria: ['Test'],
            revisionLimit: 2,
          },
        ],
        policies: {
          delayPolicy: 'd',
          cancellationPolicy: 'c',
          extraRequestPolicy: 'e',
          reviewPolicy: 'r',
        },
        ambiguityWarnings: [],
        clarityScore: -1,
      });

      expect(() => service.parseAiResponse(negativeScore)).toThrow(
        'AI returned an invalid response',
      );
    });

    it('rejects clarityScore above 100', () => {
      const aboveScore = JSON.stringify({
        milestones: [
          {
            title: 'Phase 1',
            amount: 1000,
            dueInDays: 7,
            acceptanceCriteria: ['Test'],
            revisionLimit: 2,
          },
        ],
        policies: {
          delayPolicy: 'd',
          cancellationPolicy: 'c',
          extraRequestPolicy: 'e',
          reviewPolicy: 'r',
        },
        ambiguityWarnings: [],
        clarityScore: 101,
      });

      expect(() => service.parseAiResponse(aboveScore)).toThrow(
        'AI returned an invalid response',
      );
    });

    it('rejects milestones with empty acceptanceCriteria array', () => {
      const emptyCriteria = JSON.stringify({
        milestones: [
          {
            title: 'Phase 1',
            amount: 1000,
            dueInDays: 7,
            acceptanceCriteria: [],
            revisionLimit: 2,
          },
        ],
        policies: {
          delayPolicy: 'd',
          cancellationPolicy: 'c',
          extraRequestPolicy: 'e',
          reviewPolicy: 'r',
        },
        ambiguityWarnings: [],
        clarityScore: 50,
      });

      expect(() => service.parseAiResponse(emptyCriteria)).toThrow(
        'AI returned an invalid response',
      );
    });

    it('rejects milestones with empty title', () => {
      const emptyTitle = JSON.stringify({
        milestones: [
          {
            title: '',
            amount: 1000,
            dueInDays: 7,
            acceptanceCriteria: ['Test'],
            revisionLimit: 2,
          },
        ],
        policies: {
          delayPolicy: 'd',
          cancellationPolicy: 'c',
          extraRequestPolicy: 'e',
          reviewPolicy: 'r',
        },
        ambiguityWarnings: [],
        clarityScore: 50,
      });

      expect(() => service.parseAiResponse(emptyTitle)).toThrow(
        'AI returned an invalid response',
      );
    });

    it('returns only validated plan fields and never raw provider metadata', () => {
      const withExtra = JSON.stringify({
        milestones: [
          {
            title: 'Phase 1',
            amount: 1000,
            dueInDays: 7,
            acceptanceCriteria: ['Test'],
            revisionLimit: 2,
          },
        ],
        policies: {
          delayPolicy: 'd',
          cancellationPolicy: 'c',
          extraRequestPolicy: 'e',
          reviewPolicy: 'r',
        },
        ambiguityWarnings: [],
        clarityScore: 50,
        rawResponse: 'secret',
        providerMetadata: { model: 'gemini' },
      });

      const result = service.parseAiResponse(withExtra);

      expect(result).not.toHaveProperty('rawResponse');
      expect(result).not.toHaveProperty('providerMetadata');
    });
  });

  describe('generatePlan (US1)', () => {
    const userId = 'user-1';
    const dtoBase = {
      projectDescription:
        'تصميم متجر إلكتروني متكامل مع بوابة دفع ولوحة تحكم. يمتد المشروع على مدى 3 أشهر.',
    };

    it('returns an object with persisted draft id, milestones, policies, ambiguityWarnings, and clarityScore', async () => {
      const fakeDraft = {
        id: 'draft-1',
        userId,
        input: {},
        output: {},
        rawResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.aiPlanDraft.create.mockResolvedValue(fakeDraft);

      const result = await service.generatePlan(dtoBase, userId);

      expect(result).toHaveProperty('id');
      expect(result.id).toBe('draft-1');
      expect(result).toHaveProperty('milestones');
      expect(result).toHaveProperty('policies');
      expect(result).toHaveProperty('ambiguityWarnings');
      expect(result).toHaveProperty('clarityScore');
    });

    it('calls prisma.aiPlanDraft.create exactly once with correct data', async () => {
      const fakeDraft = {
        id: 'draft-2',
        userId,
        input: {},
        output: {},
        rawResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.aiPlanDraft.create.mockResolvedValue(fakeDraft);

      await service.generatePlan(dtoBase, userId);

      expect(mockPrisma.aiPlanDraft.create).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.aiPlanDraft.create.mock.calls[0][0];
      expect(callArgs.data.userId).toBe(userId);
      expect(callArgs.data.input).toHaveProperty('projectDescription');
      expect(callArgs.data.input).toHaveProperty('language');
      expect(callArgs.data.input).toHaveProperty('currency');
      expect(callArgs.data.output).toBeDefined();
      expect(callArgs.data.rawResponse).toBe(Prisma.DbNull);
    });

    it('respects totalBudget by returning milestone amounts that total the provided budget', async () => {
      const fakeDraft = {
        id: 'draft-3',
        userId,
        input: {},
        output: {},
        rawResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.aiPlanDraft.create.mockResolvedValue(fakeDraft);

      const dto = {
        projectDescription:
          'تصميم متجر إلكتروني متكامل مع بوابة دفع ولوحة تحكم. يمتد المشروع على مدى 3 أشهر.',
        totalBudget: 12000,
      };

      const result = await service.generatePlan(dto, userId);

      const total = result.milestones.reduce((sum, m) => sum + m.amount, 0);
      expect(total).toBe(12000);
    });

    it('storeDraft returns the created draft record from prisma.aiPlanDraft.create', async () => {
      const fakeDraft = {
        id: 'draft-4',
        userId,
        input: {},
        output: {},
        rawResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.aiPlanDraft.create.mockResolvedValue(fakeDraft);

      const input = {
        projectDescription: 'desc',
        source: 'standalone' as const,
      };
      const output = {
        milestones: [],
        policies: {
          delayPolicy: '',
          cancellationPolicy: '',
          extraRequestPolicy: '',
          reviewPolicy: '',
        },
        ambiguityWarnings: [],
        clarityScore: 75,
      };

      const result = await service.storeDraft(userId, input, output, null);

      expect(result).toHaveProperty('id');
      expect(result.id).toBe('draft-4');
      expect(mockPrisma.aiPlanDraft.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('generatePlan with Gemini enabled — success path (US1)', () => {
    const userId = 'user-gemini-us1';
    const dtoBase = {
      projectDescription:
        'تصميم متجر إلكتروني متكامل مع بوابة دفع ولوحة تحكم. يمتد المشروع على مدى 3 أشهر.',
    };
    const fakeDraft = {
      id: 'draft-gemini-us1',
      userId,
      input: {},
      output: {},
      rawResponse: { text: validPlanJson },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockGeminiProvider.isEnabled = true;
      mockGeminiProvider.generateWithRetry.mockResolvedValue(validPlanJson);
      mockPrisma.aiPlanDraft.create.mockResolvedValue(fakeDraft);
    });

    it('storeDraft called with non-null rawResponse when Gemini succeeds', async () => {
      const result = await service.generatePlan(dtoBase, userId);

      expect(result).toHaveProperty('id');
      const callArgs = mockPrisma.aiPlanDraft.create.mock.calls.at(-1)?.[0];
      expect(callArgs.data.rawResponse).not.toBeNull();
      expect(callArgs.data.rawResponse).toEqual({ text: validPlanJson });
    });

    it('returned plan has correct id, milestones, and policies from AI response', async () => {
      const result = await service.generatePlan(dtoBase, userId);

      expect(result.id).toBe('draft-gemini-us1');
      expect(result.milestones).toHaveLength(1);
      expect(result.milestones[0].title).toBe('Phase 1');
      expect(result.milestones[0].amount).toBe(4000);
      expect(result.policies.delayPolicy).toBe('Delay policy text');
      expect(result.ambiguityWarnings).toEqual(['Timeline unclear']);
      expect(result.clarityScore).toBe(75);
    });

    it('generatePlanForAgreement with Gemini enabled and success → storeDraft called with non-null rawResponse', async () => {
      const agreementId = 'agr-gemini-us1';
      const fakeAgreement = {
        id: agreementId,
        freelancerId: userId,
        description: 'تطوير موقع شخصي مع مدونة مدمجة ولوحة تحكم بسيطة.',
        totalAmount: { toString: () => '15000' } as any,
        currency: 'SAR',
      };
      mockPrisma.agreement.findFirst.mockResolvedValue(fakeAgreement);
      mockPrisma.aiPlanDraft.create.mockResolvedValue({
        ...fakeDraft,
        id: 'draft-ag-gemini-us1',
      });

      const result = await service.generatePlanForAgreement(
        agreementId,
        {},
        userId,
      );

      expect(result).toHaveProperty('id');
      const callArgs = mockPrisma.aiPlanDraft.create.mock.calls.at(-1)?.[0];
      expect(callArgs.data.rawResponse).not.toBeNull();
      expect(callArgs.data.rawResponse).toEqual({ text: validPlanJson });
    });
  });

  describe('generatePlan fallback (US2)', () => {
    const userId = 'user-2';

    it('succeeds without any Gemini or external provider mock', async () => {
      const fakeDraft = {
        id: 'draft-fb-1',
        userId,
        input: {},
        output: {},
        rawResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.aiPlanDraft.create.mockResolvedValue(fakeDraft);

      const dto = {
        projectDescription:
          'تصميم تطبيق جوال لنظام إدارة المهام. مطلوب تطبيق يعمل على iOS و Android.',
      };

      const result = await service.generatePlan(dto, userId);

      expect(result).toHaveProperty('id');
      expect(result.milestones.length).toBeGreaterThanOrEqual(1);
    });

    it('fallback generatePlan stores rawResponse: null and does not expose rawResponse on the returned response', async () => {
      const fakeDraft = {
        id: 'draft-fb-2',
        userId,
        input: {},
        output: {},
        rawResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.aiPlanDraft.create.mockResolvedValue(fakeDraft);

      const dto = {
        projectDescription:
          'بناء موقع تعريفى لشركة مع لوحة تحكم بسيطة لإدارة المحتوى.',
      };

      const result = await service.generatePlan(dto, userId);

      const callArgs = mockPrisma.aiPlanDraft.create.mock.calls.at(-1)?.[0];
      expect(callArgs.data.rawResponse).toBe(Prisma.DbNull);
      expect(result).not.toHaveProperty('rawResponse');
    });

    it('fallback generatePlan stores input.source as standalone for standalone generation', async () => {
      const fakeDraft = {
        id: 'draft-fb-3',
        userId,
        input: {},
        output: {},
        rawResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.aiPlanDraft.create.mockResolvedValue(fakeDraft);

      const dto = {
        projectDescription:
          'تطوير نظام حجز مواعيد للمستشفيات مع إشعارات SMS وإيميل.',
      };

      await service.generatePlan(dto, userId);

      const callArgs = mockPrisma.aiPlanDraft.create.mock.calls.at(-1)?.[0];
      expect(callArgs.data.input).toHaveProperty('source', 'standalone');
    });
  });

  describe('generatePlanForAgreement (US3)', () => {
    const userId = 'user-3';
    const agreementId = 'agr-1';

    const fakeAgreement = {
      id: agreementId,
      freelancerId: userId,
      description: 'تطوير موقع شخصي مع مدونة مدمجة ولوحة تحكم بسيطة.',
      totalAmount: { toString: () => '15000' } as any,
      currency: 'SAR',
    };

    it('queries prisma.agreement.findFirst with both id: agreementId and freelancerId: userId', async () => {
      const fakeDraft = {
        id: 'draft-ag-1',
        userId,
        input: {},
        output: {},
        rawResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.agreement.findFirst.mockResolvedValue(fakeAgreement);
      mockPrisma.aiPlanDraft.create.mockResolvedValue(fakeDraft);

      await service.generatePlanForAgreement(agreementId, {}, userId);

      expect(mockPrisma.agreement.findFirst).toHaveBeenCalledWith({
        where: { id: agreementId, freelancerId: userId },
      });
    });

    it('returns a generated plan and creates an AiPlanDraft when the agreement belongs to the user', async () => {
      const fakeDraft = {
        id: 'draft-ag-2',
        userId,
        input: {},
        output: {},
        rawResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.agreement.findFirst.mockResolvedValue(fakeAgreement);
      mockPrisma.aiPlanDraft.create.mockResolvedValue(fakeDraft);

      const result = await service.generatePlanForAgreement(
        agreementId,
        {},
        userId,
      );

      expect(result).toHaveProperty('id');
      expect(result.id).toBe('draft-ag-2');
      expect(result).toHaveProperty('milestones');
      expect(mockPrisma.aiPlanDraft.create).toHaveBeenCalled();
    });

    it('agreement-scoped draft input includes source: agreement, agreementId, agreement description, currency, and total amount', async () => {
      const fakeDraft = {
        id: 'draft-ag-3',
        userId,
        input: {},
        output: {},
        rawResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.agreement.findFirst.mockResolvedValue(fakeAgreement);
      mockPrisma.aiPlanDraft.create.mockResolvedValue(fakeDraft);

      await service.generatePlanForAgreement(agreementId, {}, userId);

      const callArgs = mockPrisma.aiPlanDraft.create.mock.calls.at(-1)?.[0];
      expect(callArgs.data.input).toHaveProperty('source', 'agreement');
      expect(callArgs.data.input).toHaveProperty('agreementId', agreementId);
      expect(callArgs.data.input).toHaveProperty('projectDescription');
      expect(callArgs.data.input).toHaveProperty('currency');
      expect(callArgs.data.input).toHaveProperty('totalBudget');
    });

    it('request projectDescription overrides the agreement description in the generated input metadata', async () => {
      const fakeDraft = {
        id: 'draft-ag-4',
        userId,
        input: {},
        output: {},
        rawResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.agreement.findFirst.mockResolvedValue(fakeAgreement);
      mockPrisma.aiPlanDraft.create.mockResolvedValue(fakeDraft);

      const dto = {
        projectDescription: 'تطوير متجر إلكتروني بدلاً من موقع شخصي.',
      };

      await service.generatePlanForAgreement(agreementId, dto, userId);

      const callArgs = mockPrisma.aiPlanDraft.create.mock.calls.at(-1)?.[0];
      expect(callArgs.data.input.projectDescription).toBe(
        'تطوير متجر إلكتروني بدلاً من موقع شخصي.',
      );
    });

    it('throws NotFoundException with message Agreement not found. when agreement query returns null', async () => {
      mockPrisma.agreement.findFirst.mockResolvedValue(null);

      await expect(
        service.generatePlanForAgreement(
          'nonexistent-agreement',
          {} as any,
          userId,
        ),
      ).rejects.toThrow('Agreement not found.');
    });

    it('does not call prisma.aiPlanDraft.create when agreement lookup fails', async () => {
      mockPrisma.agreement.findFirst.mockResolvedValue(null);

      try {
        await service.generatePlanForAgreement(
          'nonexistent-agreement',
          {},
          userId,
        );
      } catch {
        // expected
      }

      // aiPlanDraft.create should never have been called since the agreement check failed first
      // But it may have been called by previous tests, so we check the last call args
      // Actually we need to track whether create was called with agreement-related data
      const createCalls = mockPrisma.aiPlanDraft.create.mock.calls;
      const agreementCreateCall = createCalls.find(
        (call: any) =>
          call[0]?.data?.input?.agreementId === 'nonexistent-agreement',
      );
      expect(agreementCreateCall).toBeUndefined();
    });
  });

  describe('generatePlan with Gemini enabled — fallback paths (US2)', () => {
    const userId = 'user-gemini-us2';
    const dtoBase = {
      projectDescription:
        'تصميم متجر إلكتروني متكامل مع بوابة دفع ولوحة تحكم. يمتد المشروع على مدى 3 أشهر.',
    };
    const fakeDraft = {
      id: 'draft-gemini-us2',
      userId,
      input: {},
      output: {},
      rawResponse: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockGeminiProvider.isEnabled = true;
      mockPrisma.aiPlanDraft.create.mockResolvedValue(fakeDraft);
    });

    it('falls back to mock and stores null rawResponse when Gemini throws (network error)', async () => {
      mockGeminiProvider.generateWithRetry.mockRejectedValue(
        new Error('Network error'),
      );

      const result = await service.generatePlan(dtoBase, userId);

      expect(result).toHaveProperty('id');
      expect(result.milestones.length).toBeGreaterThanOrEqual(1);
      const callArgs = mockPrisma.aiPlanDraft.create.mock.calls.at(-1)?.[0];
      expect(callArgs.data.rawResponse).toBe(Prisma.DbNull);
    });

    it('falls back to mock when Gemini returns invalid JSON (non-parseable)', async () => {
      mockGeminiProvider.generateWithRetry.mockResolvedValue(
        'not valid json at all',
      );

      const result = await service.generatePlan(dtoBase, userId);

      expect(result).toHaveProperty('id');
      expect(result.milestones.length).toBeGreaterThanOrEqual(1);
      const callArgs = mockPrisma.aiPlanDraft.create.mock.calls.at(-1)?.[0];
      expect(callArgs.data.rawResponse).toBe(Prisma.DbNull);
    });

    it('never calls generateWithRetry when isEnabled is false, returns mock plan', async () => {
      mockGeminiProvider.isEnabled = false;

      const result = await service.generatePlan(dtoBase, userId);

      expect(result).toHaveProperty('id');
      expect(mockGeminiProvider.generateWithRetry).not.toHaveBeenCalled();
    });

    it('generatePlanForAgreement with Gemini failure → falls back to mock', async () => {
      const agreementId = 'agr-gemini-us2';
      const fakeAgreement = {
        id: agreementId,
        freelancerId: userId,
        description: 'تطوير موقع شخصي مع مدونة مدمجة ولوحة تحكم بسيطة.',
        totalAmount: { toString: () => '15000' } as any,
        currency: 'SAR',
      };
      mockPrisma.agreement.findFirst.mockResolvedValue(fakeAgreement);
      mockGeminiProvider.generateWithRetry.mockRejectedValue(
        new Error('Timeout'),
      );

      const result = await service.generatePlanForAgreement(
        agreementId,
        {},
        userId,
      );

      expect(result).toHaveProperty('id');
      expect(result.milestones.length).toBeGreaterThanOrEqual(1);
      const callArgs = mockPrisma.aiPlanDraft.create.mock.calls.at(-1)?.[0];
      expect(callArgs.data.rawResponse).toBe(Prisma.DbNull);
    });
  });

  describe('rawResponse audit — US3', () => {
    const userId = 'user-gemini-us3';
    const dtoBase = {
      projectDescription:
        'تصميم متجر إلكتروني متكامل مع بوابة دفع ولوحة تحكم. يمتد المشروع على مدى 3 أشهر.',
    };
    const fakeDraft = {
      id: 'draft-gemini-us3',
      userId,
      input: {},
      output: {},
      rawResponse: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockPrisma.aiPlanDraft.create.mockResolvedValue(fakeDraft);
    });

    it('Gemini success → storeDraft called with rawResponse = { text: validPlanJson }', async () => {
      mockGeminiProvider.isEnabled = true;
      mockGeminiProvider.generateWithRetry.mockResolvedValue(validPlanJson);

      await service.generatePlan(dtoBase, userId);

      const callArgs = mockPrisma.aiPlanDraft.create.mock.calls.at(-1)?.[0];
      expect(callArgs.data.rawResponse).not.toBeNull();
      expect(callArgs.data.rawResponse).toEqual({ text: validPlanJson });
    });

    it('Gemini failure → storeDraft called with rawResponse arg of null', async () => {
      mockGeminiProvider.isEnabled = true;
      mockGeminiProvider.generateWithRetry.mockRejectedValue(
        new Error('Network error'),
      );

      await service.generatePlan(dtoBase, userId);

      const callArgs = mockPrisma.aiPlanDraft.create.mock.calls.at(-1)?.[0];
      expect(callArgs.data.rawResponse).toBe(Prisma.DbNull);
    });

    it('isEnabled: false (mock only) → storeDraft called with rawResponse arg of null', async () => {
      mockGeminiProvider.isEnabled = false;

      await service.generatePlan(dtoBase, userId);

      const callArgs = mockPrisma.aiPlanDraft.create.mock.calls.at(-1)?.[0];
      expect(callArgs.data.rawResponse).toBe(Prisma.DbNull);
    });

    it('returned GeneratedPlanResponseDto does not have a rawResponse field', async () => {
      mockGeminiProvider.isEnabled = true;
      mockGeminiProvider.generateWithRetry.mockResolvedValue(validPlanJson);

      const result = await service.generatePlan(dtoBase, userId);

      expect(result).not.toHaveProperty('rawResponse');
    });
  });
});
