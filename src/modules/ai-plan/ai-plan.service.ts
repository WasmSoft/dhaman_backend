import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  GenerateAgreementDraftDto,
  GeneratePlanDto,
  GeneratePlanForAgreementDto,
  GeneratedAgreementDraftResponseDto,
  GeneratedPlanResponseDto,
} from './dto/ai-plan.dto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { GeminiProvider } from './gemini.provider';

export interface GeneratedPlanWithoutId {
  milestones: Array<{
    title: string;
    amount: number;
    dueInDays: number;
    acceptanceCriteria: string[];
    revisionLimit: number;
  }>;
  policies: {
    delayPolicy: string | null;
    cancellationPolicy: string | null;
    extraRequestPolicy: string | null;
    reviewPolicy: string | null;
  };
  ambiguityWarnings: string[];
  clarityScore: number;
}

export interface AiPlanDraftRecord {
  id: string;
  userId: string | null;
  input: Prisma.JsonValue;
  output: Prisma.JsonValue;
  rawResponse: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AiPlanGenerationInput {
  projectDescription: string;
  language?: 'ar' | 'en';
  totalBudget?: number;
  currency?: string;
  agreementId?: string;
  source?: 'standalone' | 'agreement';
}

type GeneratedAgreementDraftWithoutId = GeneratedPlanWithoutId & {
  title: string;
  description: string;
  serviceType: string | null;
  durationText: string | null;
  expectedDeliveryDate: string | null;
  currency: string;
};

const AI_INVALID_RESPONSE_MESSAGE =
  'AI returned an invalid response format. The generated plan could not be parsed or validated.';

const DEFAULT_AI_PLAN_LANGUAGE = 'ar';
const DEFAULT_AI_PLAN_CURRENCY = 'SAR';
const AGREEMENT_NOT_FOUND_MESSAGE = 'Agreement not found.';

class AiInvalidResponseError extends Error {
  constructor() {
    super(AI_INVALID_RESPONSE_MESSAGE);
    this.name = 'AiInvalidResponseError';
  }
}

const ARABIC_MILESTONES = [
  {
    title: 'مرحلة التخطيط والتحليل',
    acceptanceCriteria: [
      'تسليم وثيقة المتطلبات الكاملة',
      'موافقة العميل على نطاق العمل',
      'تحديد الجدول الزمني النهائي',
    ],
    revisionLimit: 2,
  },
  {
    title: 'مرحلة التصميم والتطوير',
    acceptanceCriteria: [
      'تسليم النماذج الأولية للتصميم',
      'موافقة العميل على التصاميم النهائية',
      'تسليم نسخة تجريبية قابلة للتجربة',
    ],
    revisionLimit: 3,
  },
  {
    title: 'مرحلة التسليم والاختبار',
    acceptanceCriteria: [
      'تسليم النسخة النهائية كاملة',
      'اجتياز اختبارات القبول',
      'تسليم وثائق المستخدم والتدريب',
    ],
    revisionLimit: 2,
  },
];

const ARABIC_POLICIES = {
  delayPolicy:
    'في حال تأخر أي من الطرفين عن المواعيد المتفق عليها، يتم منح مهلة إضافية مدتها 3 أيام عمل. بعد انتهاء المهلة، يحق للطرف الآخر المطالبة بتعويض بنسبة 5% من قيمة المرحلة المتأخرة.',
  cancellationPolicy:
    'يحق لأي من الطرفين إلغاء الاتفاقية بإشعار خطي قبل 14 يوم عمل. تستحق المبالغ الخاصة بالمراحل المنجزة والمعتمدة فقط، ولا يحق للمستقل المطالبة بمبالغ المراحل غير المنجزة.',
  extraRequestPolicy:
    'أي طلب إضافي خارج نطاق العمل المتفق عليه يتطلب عرض سعر منفصل وموافقة خطية من الطرفين قبل البدء بالتنفيذ. لا يتم احتساب الطلبات الإضافية ضمن نطاق المراحل الحالية.',
  reviewPolicy:
    'يحق للعميل طلب تعديلات خلال 5 أيام عمل من تاريخ التسليم. الحد الأقصى للمراجعات محدد لكل مرحلة. التعديلات الإضافية تتطلب رسوماً إضافية حسب حجم التغيير.',
};

const ARABIC_WARNINGS = [
  'لم يتم تحديد مدة زمنية واضحة للمشروع بالكامل، يرجى توضيح الجدول الزمني المتوقع.',
  'المواصفات التقنية غير محددة بشكل كافٍ، قد تحتاج بعض المتطلبات إلى تفصيل إضافي لاحقاً.',
];

const ENGLISH_MILESTONES = [
  {
    title: 'Planning & Analysis Phase',
    acceptanceCriteria: [
      'Deliver complete requirements document',
      'Client approves scope of work',
      'Finalize project timeline',
    ],
    revisionLimit: 2,
  },
  {
    title: 'Design & Development Phase',
    acceptanceCriteria: [
      'Deliver design prototypes',
      'Client approves final designs',
      'Deliver functional beta version',
    ],
    revisionLimit: 3,
  },
  {
    title: 'Delivery & Testing Phase',
    acceptanceCriteria: [
      'Deliver final complete version',
      'Pass acceptance tests',
      'Deliver user documentation and training',
    ],
    revisionLimit: 2,
  },
];

const ENGLISH_POLICIES = {
  delayPolicy:
    'If either party delays beyond agreed deadlines, a 3-business-day grace period is granted. After the grace period, the other party may claim 5% compensation of the delayed milestone value.',
  cancellationPolicy:
    'Either party may cancel the agreement with 14 business days written notice. Only completed and approved milestone amounts are due; the freelancer cannot claim amounts for uncompleted milestones.',
  extraRequestPolicy:
    'Any request beyond the agreed scope requires a separate quotation and written approval from both parties before execution. Extra requests are not counted within the current milestone scope.',
  reviewPolicy:
    'The client may request revisions within 5 business days of delivery. The maximum number of revisions is set per milestone. Additional revisions incur extra fees based on the scope of change.',
};

const ENGLISH_WARNINGS = [
  'No clear overall project timeline has been specified; please clarify the expected schedule.',
  'Technical specifications are not sufficiently detailed; some requirements may need further elaboration later.',
];

const DEFAULT_AMOUNTS = [
  { amount: 4000, dueInDays: 7 },
  { amount: 3000, dueInDays: 14 },
  { amount: 3000, dueInDays: 21 },
];

const MILESTONE_REQUIRED_FIELDS: Array<
  keyof GeneratedPlanWithoutId['milestones'][number]
> = ['title', 'amount', 'dueInDays', 'acceptanceCriteria', 'revisionLimit'];

const POLICY_REQUIRED_FIELDS: Array<keyof GeneratedPlanWithoutId['policies']> =
  ['delayPolicy', 'cancellationPolicy', 'extraRequestPolicy', 'reviewPolicy'];

@Injectable()
export class AiPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiProvider: GeminiProvider,
  ) {}

  generateMockPlan(
    _projectDescription: string,
    language?: 'ar' | 'en',
    budget?: number,
  ): GeneratedPlanWithoutId {
    const isEnglish = language === 'en';
    const milestones = isEnglish ? ENGLISH_MILESTONES : ARABIC_MILESTONES;
    const policies = isEnglish ? ENGLISH_POLICIES : ARABIC_POLICIES;
    const warnings = isEnglish ? ENGLISH_WARNINGS : ARABIC_WARNINGS;

    const milestoneAmounts = this.computeMilestoneAmounts(budget);
    const generatedMilestones = milestones.map((template, index) => ({
      title: template.title,
      amount: milestoneAmounts[index],
      dueInDays: DEFAULT_AMOUNTS[index].dueInDays,
      acceptanceCriteria: template.acceptanceCriteria,
      revisionLimit: template.revisionLimit,
    }));

    return {
      milestones: generatedMilestones,
      policies: { ...policies },
      ambiguityWarnings: [...warnings],
      clarityScore: 75,
    };
  }

  private computeMilestoneAmounts(budget?: number): number[] {
    if (budget === undefined) {
      return DEFAULT_AMOUNTS.map((d) => d.amount);
    }

    const first = Math.round(budget * 0.4);
    const second = Math.round(budget * 0.3);
    const third = budget - first - second;

    return [first, second, third];
  }

  buildPrompt(
    projectDescription: string,
    language: string,
    budget?: number,
    currency?: string,
  ): string {
    const outputLanguage = language === 'en' ? 'English' : 'Arabic';
    const budgetSection =
      budget !== undefined
        ? `Budget hint: ${budget} ${currency ?? 'SAR'}.`
        : 'No budget hint provided.';
    const currencyNote = currency ? `Currency is ${currency}.` : '';

    return [
      'Task:',
      'You are an expert freelance project planner. Read the project description below and produce a structured payment plan.',
      '',
      'Rules:',
      '- Return JSON only. Do not return markdown or any text outside the JSON object.',
      '- All text fields must be written in ' + outputLanguage + '.',
      '- Identify any ambiguity in the project description and list it under ambiguityWarnings.',
      '- Assign a clarity score from 0 (very unclear) to 100 (very clear) based on how well the project is specified.',
      '- Generate between 2 and 5 milestones that cover the full project lifecycle.',
      '',
      'Project:',
      projectDescription,
      budgetSection,
      currencyNote,
      '',
      'Output JSON shape:',
      '{',
      '  "milestones": [',
      '    {',
      '      "title": "string",',
      '      "amount": number,',
      '      "dueInDays": number,',
      '      "acceptanceCriteria": ["string"],',
      '      "revisionLimit": number',
      '    }',
      '  ],',
      '  "policies": {',
      '    "delayPolicy": "string",',
      '    "cancellationPolicy": "string",',
      '    "extraRequestPolicy": "string",',
      '    "reviewPolicy": "string"',
      '  },',
      '  "ambiguityWarnings": ["string"],',
      '  "clarityScore": number',
      '}',
    ].join('\n');
  }

  buildAgreementDraftPrompt(input: {
    projectTitle?: string;
    projectDescription: string;
    clientName?: string;
    serviceType?: string;
    durationText?: string;
    expectedDeliveryDate?: string;
    language: string;
    totalBudget?: number;
    currency: string;
  }): string {
    const outputLanguage = input.language === 'en' ? 'English' : 'Arabic';

    return [
      'Task:',
      'You are an expert freelance agreement planner. Build a clean agreement draft and payment plan from the project context below.',
      '',
      'Rules:',
      '- Return JSON only. Do not return markdown or explanation outside the JSON object.',
      `- All text fields must be written in ${outputLanguage}.`,
      '- Keep the title concise and professional.',
      '- The description must be clear enough for a client-facing agreement draft.',
      '- Generate between 2 and 5 milestones that cover the full project lifecycle.',
      '- Include practical policies for delay, cancellation, extra requests, and review handling.',
      '- Assign a clarity score from 0 to 100.',
      '',
      `Project title: ${input.projectTitle ?? 'N/A'}`,
      `Project description: ${input.projectDescription}`,
      `Client name: ${input.clientName ?? 'N/A'}`,
      `Service type: ${input.serviceType ?? 'N/A'}`,
      `Duration text: ${input.durationText ?? 'N/A'}`,
      `Expected delivery date: ${input.expectedDeliveryDate ?? 'N/A'}`,
      `Budget hint: ${input.totalBudget ?? 'N/A'}`,
      `Currency: ${input.currency}`,
      '',
      'Output JSON shape:',
      '{',
      '  "title": "string",',
      '  "description": "string",',
      '  "serviceType": "string",',
      '  "durationText": "string",',
      '  "expectedDeliveryDate": "YYYY-MM-DD or null",',
      '  "currency": "string",',
      '  "milestones": [',
      '    {',
      '      "title": "string",',
      '      "amount": number,',
      '      "dueInDays": number,',
      '      "acceptanceCriteria": ["string"],',
      '      "revisionLimit": number',
      '    }',
      '  ],',
      '  "policies": {',
      '    "delayPolicy": "string",',
      '    "cancellationPolicy": "string",',
      '    "extraRequestPolicy": "string",',
      '    "reviewPolicy": "string"',
      '  },',
      '  "ambiguityWarnings": ["string"],',
      '  "clarityScore": number',
      '}',
    ].join('\n');
  }

  parseAiResponse(rawResponse: string): GeneratedPlanWithoutId {
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      throw new AiInvalidResponseError();
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new AiInvalidResponseError();
    }

    const obj = parsed as Record<string, unknown>;

    if (!Array.isArray(obj.milestones) || obj.milestones.length === 0) {
      throw new AiInvalidResponseError();
    }

    const milestones = obj.milestones as Array<Record<string, unknown>>;

    for (const milestone of milestones) {
      for (const field of MILESTONE_REQUIRED_FIELDS) {
        if (!(field in milestone)) {
          throw new AiInvalidResponseError();
        }
      }

      if (typeof milestone.title !== 'string' || milestone.title.length === 0) {
        throw new AiInvalidResponseError();
      }

      if (
        typeof milestone.amount !== 'number' ||
        Number.isNaN(milestone.amount)
      ) {
        throw new AiInvalidResponseError();
      }

      if (
        typeof milestone.dueInDays !== 'number' ||
        Number.isNaN(milestone.dueInDays)
      ) {
        throw new AiInvalidResponseError();
      }

      if (
        !Array.isArray(milestone.acceptanceCriteria) ||
        milestone.acceptanceCriteria.length === 0
      ) {
        throw new AiInvalidResponseError();
      }

      if (
        !milestone.acceptanceCriteria.every(
          (c) => typeof c === 'string' && c.length > 0,
        )
      ) {
        throw new AiInvalidResponseError();
      }

      if (
        typeof milestone.revisionLimit !== 'number' ||
        Number.isNaN(milestone.revisionLimit)
      ) {
        throw new AiInvalidResponseError();
      }
    }

    const policies = obj.policies as Record<string, unknown> | undefined;
    if (
      typeof policies !== 'object' ||
      policies === null ||
      Array.isArray(policies)
    ) {
      throw new AiInvalidResponseError();
    }

    for (const field of POLICY_REQUIRED_FIELDS) {
      if (typeof policies[field] !== 'string' || policies[field].length === 0) {
        throw new AiInvalidResponseError();
      }
    }

    if (
      !Array.isArray(obj.ambiguityWarnings) ||
      !obj.ambiguityWarnings.every((w) => typeof w === 'string')
    ) {
      throw new AiInvalidResponseError();
    }

    const clarityScore = obj.clarityScore;
    if (
      typeof clarityScore !== 'number' ||
      Number.isNaN(clarityScore) ||
      clarityScore < 0 ||
      clarityScore > 100
    ) {
      throw new AiInvalidResponseError();
    }

    return {
      milestones: milestones.map((m) => ({
        title: m.title as string,
        amount: m.amount as number,
        dueInDays: m.dueInDays as number,
        acceptanceCriteria: m.acceptanceCriteria as string[],
        revisionLimit: m.revisionLimit as number,
      })),
      policies: {
        delayPolicy: policies.delayPolicy as string,
        cancellationPolicy: policies.cancellationPolicy as string,
        extraRequestPolicy: policies.extraRequestPolicy as string,
        reviewPolicy: policies.reviewPolicy as string,
      },
      ambiguityWarnings: obj.ambiguityWarnings,
      clarityScore: clarityScore,
    };
  }

  private buildMockAgreementDraft(
    dto: GenerateAgreementDraftDto,
    language: 'ar' | 'en',
    currency: string,
  ): GeneratedAgreementDraftWithoutId {
    const projectDescription =
      dto.projectDescription?.trim() ||
      dto.projectTitle?.trim() ||
      (language === 'en' ? 'New freelance project' : 'مشروع عمل حر جديد');
    const plan = this.generateMockPlan(
      projectDescription,
      language,
      dto.totalBudget,
    );
    const fallbackTitle =
      dto.projectTitle?.trim() ||
      (language === 'en'
        ? 'Freelance Service Agreement'
        : 'اتفاق تقديم خدمة مستقلة');

    return {
      title:
        language === 'en'
          ? fallbackTitle
          : fallbackTitle.startsWith('اتفاق')
            ? fallbackTitle
            : `اتفاق ${fallbackTitle}`,
      description:
        dto.projectDescription?.trim() ||
        (language === 'en'
          ? `Provide ${dto.serviceType ?? 'freelance services'} for ${dto.clientName ?? 'the client'} with clear milestones and acceptance criteria.`
          : `تنفيذ ${dto.serviceType ?? 'خدمة مستقلة'} لصالح ${dto.clientName ?? 'العميل'} مع مراحل واضحة ومعايير قبول محددة.`),
      serviceType:
        dto.serviceType?.trim() ||
        (language === 'en' ? 'Freelance Services' : 'خدمة مستقلة'),
      durationText:
        dto.durationText?.trim() ||
        `${Math.max(...plan.milestones.map((milestone) => milestone.dueInDays))} ${
          language === 'en' ? 'days' : 'يوم'
        }`,
      expectedDeliveryDate: dto.expectedDeliveryDate?.trim() || null,
      currency,
      milestones: plan.milestones,
      policies: plan.policies,
      ambiguityWarnings: plan.ambiguityWarnings,
      clarityScore: plan.clarityScore,
    };
  }

  private parseAgreementDraftAiResponse(
    rawResponse: string,
  ): GeneratedAgreementDraftWithoutId {
    const parsedPlan = this.parseAiResponse(rawResponse);
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      throw new AiInvalidResponseError();
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new AiInvalidResponseError();
    }

    const obj = parsed as Record<string, unknown>;

    if (typeof obj.title !== 'string' || obj.title.trim().length === 0) {
      throw new AiInvalidResponseError();
    }

    if (
      typeof obj.description !== 'string' ||
      obj.description.trim().length === 0
    ) {
      throw new AiInvalidResponseError();
    }

    if (typeof obj.currency !== 'string' || obj.currency.trim().length === 0) {
      throw new AiInvalidResponseError();
    }

    if (
      obj.serviceType !== undefined &&
      obj.serviceType !== null &&
      typeof obj.serviceType !== 'string'
    ) {
      throw new AiInvalidResponseError();
    }

    if (
      obj.durationText !== undefined &&
      obj.durationText !== null &&
      typeof obj.durationText !== 'string'
    ) {
      throw new AiInvalidResponseError();
    }

    if (
      obj.expectedDeliveryDate !== undefined &&
      obj.expectedDeliveryDate !== null &&
      typeof obj.expectedDeliveryDate !== 'string'
    ) {
      throw new AiInvalidResponseError();
    }

    return {
      title: obj.title.trim(),
      description: obj.description.trim(),
      serviceType:
        typeof obj.serviceType === 'string' && obj.serviceType.trim().length > 0
          ? obj.serviceType.trim()
          : null,
      durationText:
        typeof obj.durationText === 'string' && obj.durationText.trim().length > 0
          ? obj.durationText.trim()
          : null,
      expectedDeliveryDate:
        typeof obj.expectedDeliveryDate === 'string' &&
        obj.expectedDeliveryDate.trim().length > 0
          ? obj.expectedDeliveryDate.trim()
          : null,
      currency: obj.currency.trim(),
      milestones: parsedPlan.milestones,
      policies: parsedPlan.policies,
      ambiguityWarnings: parsedPlan.ambiguityWarnings,
      clarityScore: parsedPlan.clarityScore,
    };
  }

  async storeDraft(
    userId: string,
    input: AiPlanGenerationInput,
    output: GeneratedPlanWithoutId,
    rawResponse?: object | null,
  ): Promise<AiPlanDraftRecord> {
    return await this.prisma.aiPlanDraft.create({
      data: {
        userId,
        input: input as unknown as Prisma.InputJsonValue,
        output: output as unknown as Prisma.InputJsonValue,
        rawResponse: rawResponse
          ? (rawResponse as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull,
      },
    });
  }

  async generatePlan(
    dto: GeneratePlanDto,
    userId: string,
  ): Promise<GeneratedPlanResponseDto> {
    const language = dto.language ?? DEFAULT_AI_PLAN_LANGUAGE;
    const currency = dto.currency ?? DEFAULT_AI_PLAN_CURRENCY;

    let validatedOutput: GeneratedPlanWithoutId;
    let rawResponseObj: object | null = null;

    if (this.geminiProvider.isEnabled) {
      try {
        const prompt = this.buildPrompt(
          dto.projectDescription,
          language,
          dto.totalBudget,
          currency,
        );
        const rawText = await this.geminiProvider.generateWithRetry(prompt);
        validatedOutput = this.parseAiResponse(rawText);
        rawResponseObj = { text: rawText };
      } catch {
        const mockOutput = this.generateMockPlan(
          dto.projectDescription,
          language,
          dto.totalBudget,
        );
        validatedOutput = this.parseAiResponse(JSON.stringify(mockOutput));
        rawResponseObj = null;
      }
    } else {
      const mockOutput = this.generateMockPlan(
        dto.projectDescription,
        language,
        dto.totalBudget,
      );
      validatedOutput = this.parseAiResponse(JSON.stringify(mockOutput));
    }

    const input: AiPlanGenerationInput = {
      projectDescription: dto.projectDescription,
      language,
      totalBudget: dto.totalBudget,
      currency,
      source: 'standalone',
    };

    const draft = await this.storeDraft(
      userId,
      input,
      validatedOutput,
      rawResponseObj,
    );

    return {
      id: draft.id,
      milestones: validatedOutput.milestones,
      policies: validatedOutput.policies,
      ambiguityWarnings: validatedOutput.ambiguityWarnings,
      clarityScore: validatedOutput.clarityScore,
    };
  }

  async generatePlanForAgreement(
    agreementId: string,
    dto: GeneratePlanForAgreementDto,
    userId: string,
  ): Promise<GeneratedPlanResponseDto> {
    const agreement = await this.prisma.agreement.findFirst({
      where: { id: agreementId, freelancerId: userId },
    });

    if (!agreement) {
      throw new NotFoundException(AGREEMENT_NOT_FOUND_MESSAGE);
    }

    const language = dto.language ?? DEFAULT_AI_PLAN_LANGUAGE;
    const projectDescription =
      dto.projectDescription ?? agreement.description ?? agreement.title;
    const budget = agreement.totalAmount
      ? Number(agreement.totalAmount)
      : undefined;
    const currency = agreement.currency ?? DEFAULT_AI_PLAN_CURRENCY;

    let validatedOutput: GeneratedPlanWithoutId;
    let rawResponseObj: object | null = null;

    if (this.geminiProvider.isEnabled) {
      try {
        const prompt = this.buildPrompt(
          projectDescription,
          language,
          budget,
          currency,
        );
        const rawText = await this.geminiProvider.generateWithRetry(prompt);
        validatedOutput = this.parseAiResponse(rawText);
        rawResponseObj = { text: rawText };
      } catch {
        const mockOutput = this.generateMockPlan(
          projectDescription,
          language,
          budget,
        );
        validatedOutput = this.parseAiResponse(JSON.stringify(mockOutput));
        rawResponseObj = null;
      }
    } else {
      const mockOutput = this.generateMockPlan(
        projectDescription,
        language,
        budget,
      );
      validatedOutput = this.parseAiResponse(JSON.stringify(mockOutput));
    }

    const input: AiPlanGenerationInput = {
      projectDescription,
      language,
      totalBudget: budget,
      currency,
      agreementId,
      source: 'agreement',
    };

    const draft = await this.storeDraft(
      userId,
      input,
      validatedOutput,
      rawResponseObj,
    );

    return {
      id: draft.id,
      milestones: validatedOutput.milestones,
      policies: validatedOutput.policies,
      ambiguityWarnings: validatedOutput.ambiguityWarnings,
      clarityScore: validatedOutput.clarityScore,
    };
  }

  async generateAgreementDraft(
    dto: GenerateAgreementDraftDto,
    userId: string,
  ): Promise<GeneratedAgreementDraftResponseDto> {
    const language = dto.language ?? DEFAULT_AI_PLAN_LANGUAGE;
    const currency = dto.currency ?? DEFAULT_AI_PLAN_CURRENCY;
    const projectDescription =
      dto.projectDescription?.trim() ||
      dto.projectTitle?.trim() ||
      (language === 'en' ? 'New freelance project' : 'مشروع عمل حر جديد');

    let validatedOutput: GeneratedAgreementDraftWithoutId;
    let rawResponseObj: object | null = null;

    if (this.geminiProvider.isEnabled) {
      try {
        const prompt = this.buildAgreementDraftPrompt({
          projectTitle: dto.projectTitle,
          projectDescription,
          clientName: dto.clientName,
          serviceType: dto.serviceType,
          durationText: dto.durationText,
          expectedDeliveryDate: dto.expectedDeliveryDate,
          language,
          totalBudget: dto.totalBudget,
          currency,
        });
        const rawText = await this.geminiProvider.generateWithRetry(prompt);
        validatedOutput = this.parseAgreementDraftAiResponse(rawText);
        rawResponseObj = { text: rawText };
      } catch {
        validatedOutput = this.buildMockAgreementDraft(dto, language, currency);
      }
    } else {
      validatedOutput = this.buildMockAgreementDraft(dto, language, currency);
    }

    const input: AiPlanGenerationInput = {
      projectDescription,
      language,
      totalBudget: dto.totalBudget,
      currency,
      source: 'standalone',
    };

    const draft = await this.storeDraft(
      userId,
      input,
      {
        milestones: validatedOutput.milestones,
        policies: validatedOutput.policies,
        ambiguityWarnings: validatedOutput.ambiguityWarnings,
        clarityScore: validatedOutput.clarityScore,
      },
      rawResponseObj,
    );

    return {
      id: draft.id,
      title: validatedOutput.title,
      description: validatedOutput.description,
      serviceType: validatedOutput.serviceType,
      durationText: validatedOutput.durationText,
      expectedDeliveryDate: validatedOutput.expectedDeliveryDate,
      currency: validatedOutput.currency,
      milestones: validatedOutput.milestones,
      policies: validatedOutput.policies,
      ambiguityWarnings: validatedOutput.ambiguityWarnings,
      clarityScore: validatedOutput.clarityScore,
    };
  }
}
