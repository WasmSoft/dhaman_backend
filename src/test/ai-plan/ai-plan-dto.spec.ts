import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import {
  GeneratePlanDto,
  GeneratePlanForAgreementDto,
  GeneratedMilestoneDto,
  GeneratedPoliciesDto,
  GeneratedPlanResponseDto,
} from '../../modules/ai-plan/dto';

async function validateDto<T extends object>(
  dto: new () => T,
  payload: Record<string, unknown>,
): Promise<ValidationError[]> {
  return validate(plainToInstance(dto, payload));
}

function constraintsFor(
  errors: ValidationError[],
  property: string,
): Record<string, string> {
  return errors.find((error) => error.property === property)?.constraints ?? {};
}

describe('AI Plan DTO validation', () => {
  describe('GeneratePlanDto', () => {
    it('accepts a valid payload with all fields', async () => {
      const errors = await validateDto(GeneratePlanDto, {
        projectDescription: 'تصميم متجر إلكتروني مع بوابة دفع ولوحة إدارة',
        language: 'ar',
        totalBudget: 12000,
        currency: 'SAR',
      });

      expect(errors).toHaveLength(0);
    });

    it('accepts a valid payload with only required fields', async () => {
      const errors = await validateDto(GeneratePlanDto, {
        projectDescription:
          'Design and develop a complete e-commerce platform with payment integration',
      });

      expect(errors).toHaveLength(0);
    });

    it('rejects project description shorter than 20 characters', async () => {
      const errors = await validateDto(GeneratePlanDto, {
        projectDescription: 'Too short',
      });

      expect(constraintsFor(errors, 'projectDescription')).toHaveProperty(
        'minLength',
      );
    });

    it('rejects project description longer than 5000 characters', async () => {
      const errors = await validateDto(GeneratePlanDto, {
        projectDescription: 'A'.repeat(5001),
      });

      expect(constraintsFor(errors, 'projectDescription')).toHaveProperty(
        'maxLength',
      );
    });

    it('rejects unsupported language value', async () => {
      const errors = await validateDto(GeneratePlanDto, {
        projectDescription: 'تصميم متجر إلكتروني مع بوابة دفع ولوحة إدارة',
        language: 'fr',
      });

      expect(constraintsFor(errors, 'language')).toHaveProperty('isIn');
    });

    it('rejects budget below 100', async () => {
      const errors = await validateDto(GeneratePlanDto, {
        projectDescription: 'تصميم متجر إلكتروني مع بوابة دفع ولوحة إدارة',
        totalBudget: 50,
      });

      expect(constraintsFor(errors, 'totalBudget')).toHaveProperty('min');
    });

    it('rejects budget above 1000000', async () => {
      const errors = await validateDto(GeneratePlanDto, {
        projectDescription: 'تصميم متجر إلكتروني مع بوابة دفع ولوحة إدارة',
        totalBudget: 2000000,
      });

      expect(constraintsFor(errors, 'totalBudget')).toHaveProperty('max');
    });

    it('accepts valid language "en"', async () => {
      const errors = await validateDto(GeneratePlanDto, {
        projectDescription: 'Design and develop a complete e-commerce platform',
        language: 'en',
      });

      expect(errors).toHaveLength(0);
    });
  });

  describe('GeneratePlanForAgreementDto', () => {
    it('accepts a valid payload with both optional fields present', async () => {
      const errors = await validateDto(GeneratePlanForAgreementDto, {
        projectDescription: 'تطوير صفحة هبوط وربطها بنظام التحليلات',
        language: 'ar',
      });

      expect(errors).toHaveLength(0);
    });

    it('accepts an empty payload with both optional fields omitted', async () => {
      const errors = await validateDto(GeneratePlanForAgreementDto, {});

      expect(errors).toHaveLength(0);
    });

    it('rejects too-short project description when provided', async () => {
      const errors = await validateDto(GeneratePlanForAgreementDto, {
        projectDescription: 'Short',
      });

      expect(constraintsFor(errors, 'projectDescription')).toHaveProperty(
        'minLength',
      );
    });

    it('rejects unsupported language when provided', async () => {
      const errors = await validateDto(GeneratePlanForAgreementDto, {
        language: 'de',
      });

      expect(constraintsFor(errors, 'language')).toHaveProperty('isIn');
    });
  });

  describe('GeneratedMilestoneDto', () => {
    it('can be instantiated with all required fields', () => {
      const milestone = plainToInstance(GeneratedMilestoneDto, {
        title: 'مرحلة التصميم الأولي',
        amount: 4800,
        dueInDays: 7,
        acceptanceCriteria: [
          'تسليم التصاميم الرئيسية',
          'موافقة العميل على الهوية البصرية',
        ],
        revisionLimit: 2,
      });

      expect(milestone).toBeInstanceOf(GeneratedMilestoneDto);
      expect(milestone.title).toBe('مرحلة التصميم الأولي');
      expect(milestone.amount).toBe(4800);
      expect(milestone.dueInDays).toBe(7);
      expect(milestone.acceptanceCriteria).toHaveLength(2);
      expect(milestone.revisionLimit).toBe(2);
    });
  });

  describe('GeneratedPoliciesDto', () => {
    it('can be instantiated with all four policy fields', () => {
      const policies = plainToInstance(GeneratedPoliciesDto, {
        delayPolicy: 'يتم تمديد الموعد فقط عند موافقة الطرفين كتابياً.',
        cancellationPolicy:
          'تستحق المبالغ الخاصة بالمراحل المقبولة قبل الإلغاء.',
        extraRequestPolicy: 'أي طلب خارج النطاق يحتاج عرض تكلفة منفصل.',
        reviewPolicy: 'للعميل جولتا مراجعة لكل مرحلة قبل الاعتماد النهائي.',
      });

      expect(policies).toBeInstanceOf(GeneratedPoliciesDto);
      expect(policies.delayPolicy).toBe(
        'يتم تمديد الموعد فقط عند موافقة الطرفين كتابياً.',
      );
      expect(policies.cancellationPolicy).toBe(
        'تستحق المبالغ الخاصة بالمراحل المقبولة قبل الإلغاء.',
      );
      expect(policies.extraRequestPolicy).toBe(
        'أي طلب خارج النطاق يحتاج عرض تكلفة منفصل.',
      );
      expect(policies.reviewPolicy).toBe(
        'للعميل جولتا مراجعة لكل مرحلة قبل الاعتماد النهائي.',
      );
    });
  });

  describe('GeneratedPlanResponseDto', () => {
    it('exposes id, milestones, policies, ambiguityWarnings, and clarityScore', () => {
      const response = plainToInstance(GeneratedPlanResponseDto, {
        id: 'clx123aiPlanDraft',
        milestones: [
          {
            title: 'مرحلة التصميم الأولي',
            amount: 4800,
            dueInDays: 7,
            acceptanceCriteria: ['تسليم التصاميم الرئيسية'],
            revisionLimit: 2,
          },
        ],
        policies: {
          delayPolicy: 'يتم تمديد الموعد فقط عند موافقة الطرفين كتابياً.',
          cancellationPolicy:
            'تستحق المبالغ الخاصة بالمراحل المقبولة قبل الإلغاء.',
          extraRequestPolicy: 'أي طلب خارج النطاق يحتاج عرض تكلفة منفصل.',
          reviewPolicy: 'للعميل جولتا مراجعة لكل مرحلة قبل الاعتماد النهائي.',
        },
        ambiguityWarnings: ['مدة المشروع غير محددة بوضوح'],
        clarityScore: 75,
      });

      expect(response).toBeInstanceOf(GeneratedPlanResponseDto);
      expect(response.id).toBe('clx123aiPlanDraft');
      expect(response.milestones).toHaveLength(1);
      expect(response.policies).toBeInstanceOf(GeneratedPoliciesDto);
      expect(response.ambiguityWarnings).toEqual([
        'مدة المشروع غير محددة بوضوح',
      ]);
      expect(response.clarityScore).toBe(75);
    });

    it('does not have rawResponse or userId fields', () => {
      const response = plainToInstance(GeneratedPlanResponseDto, {
        id: 'draft-1',
        milestones: [],
        policies: {},
        ambiguityWarnings: [],
        clarityScore: 50,
      });

      expect(response).not.toHaveProperty('rawResponse');
      expect(response).not.toHaveProperty('userId');
    });

    it('rejects clarityScore below 0', async () => {
      const errors = await validateDto(GeneratedPlanResponseDto, {
        id: 'draft-1',
        milestones: [
          {
            title: 'مرحلة أولى',
            amount: 1000,
            dueInDays: 5,
            acceptanceCriteria: ['معيار'],
            revisionLimit: 1,
          },
        ],
        policies: {
          delayPolicy: 'سياسة تأخير',
          cancellationPolicy: 'سياسة إلغاء',
          extraRequestPolicy: 'سياسة طلبات',
          reviewPolicy: 'سياسة مراجعة',
        },
        ambiguityWarnings: [],
        clarityScore: -1,
      });

      expect(constraintsFor(errors, 'clarityScore')).toHaveProperty('min');
    });

    it('rejects clarityScore above 100', async () => {
      const errors = await validateDto(GeneratedPlanResponseDto, {
        id: 'draft-1',
        milestones: [
          {
            title: 'مرحلة أولى',
            amount: 1000,
            dueInDays: 5,
            acceptanceCriteria: ['معيار'],
            revisionLimit: 1,
          },
        ],
        policies: {
          delayPolicy: 'سياسة تأخير',
          cancellationPolicy: 'سياسة إلغاء',
          extraRequestPolicy: 'سياسة طلبات',
          reviewPolicy: 'سياسة مراجعة',
        },
        ambiguityWarnings: [],
        clarityScore: 101,
      });

      expect(constraintsFor(errors, 'clarityScore')).toHaveProperty('max');
    });
  });
});
