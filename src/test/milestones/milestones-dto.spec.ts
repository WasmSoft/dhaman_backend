import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import {
  CreateMilestoneDto,
  ReorderMilestonesDto,
  UpdateMilestoneDto,
} from '../../modules/milestones/dto/milestones.dto';

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

describe('Milestones DTO validation', () => {
  describe('CreateMilestoneDto', () => {
    it('accepts a valid create payload', async () => {
      const errors = await validateDto(CreateMilestoneDto, {
        title: 'Brand identity delivery',
        amount: '2500.00',
        orderIndex: 1,
        acceptanceCriteria: [{ description: 'Logo delivered in SVG format' }],
      });

      expect(errors).toHaveLength(0);
    });

    it('rejects missing title', async () => {
      const errors = await validateDto(CreateMilestoneDto, {
        amount: '2500.00',
        orderIndex: 1,
        acceptanceCriteria: [{ description: 'Logo delivered in SVG format' }],
      });

      expect(constraintsFor(errors, 'title')).toHaveProperty('isNotEmpty');
    });

    it('rejects invalid decimal money strings', async () => {
      const errors = await validateDto(CreateMilestoneDto, {
        title: 'Brand identity delivery',
        amount: '0.001',
        orderIndex: 1,
        acceptanceCriteria: [{ description: 'Logo delivered in SVG format' }],
      });

      expect(constraintsFor(errors, 'amount')).toHaveProperty('matches');
    });

    it('rejects empty acceptance criteria arrays', async () => {
      const errors = await validateDto(CreateMilestoneDto, {
        title: 'Brand identity delivery',
        amount: '2500.00',
        orderIndex: 1,
        acceptanceCriteria: [],
      });

      expect(constraintsFor(errors, 'acceptanceCriteria')).toHaveProperty(
        'arrayMinSize',
      );
    });

    it('rejects nested acceptance criteria without description', async () => {
      const errors = await validateDto(CreateMilestoneDto, {
        title: 'Brand identity delivery',
        amount: '2500.00',
        orderIndex: 1,
        acceptanceCriteria: [{ required: true }],
      });

      expect(
        errors.find((error) => error.property === 'acceptanceCriteria'),
      ).toBeDefined();
    });

    it('rejects non-positive orderIndex values', async () => {
      const errors = await validateDto(CreateMilestoneDto, {
        title: 'Brand identity delivery',
        amount: '2500.00',
        orderIndex: 0,
        acceptanceCriteria: [{ description: 'Logo delivered in SVG format' }],
      });

      expect(constraintsFor(errors, 'orderIndex')).toHaveProperty('min');
    });
  });

  describe('UpdateMilestoneDto', () => {
    it('accepts a valid partial update payload', async () => {
      const errors = await validateDto(UpdateMilestoneDto, {
        amount: '2750.00',
        acceptanceCriteria: [{ description: 'Source files delivered' }],
      });

      expect(errors).toHaveLength(0);
    });

    it('rejects empty titles', async () => {
      const errors = await validateDto(UpdateMilestoneDto, {
        title: '',
      });

      expect(constraintsFor(errors, 'title')).toHaveProperty('isNotEmpty');
    });

    it('rejects invalid due dates', async () => {
      const errors = await validateDto(UpdateMilestoneDto, {
        dueDate: 'not-a-date',
      });

      expect(constraintsFor(errors, 'dueDate')).toHaveProperty('isDateString');
    });

    it('rejects empty update acceptance criteria arrays', async () => {
      const errors = await validateDto(UpdateMilestoneDto, {
        acceptanceCriteria: [],
      });

      expect(constraintsFor(errors, 'acceptanceCriteria')).toHaveProperty(
        'arrayMinSize',
      );
    });

    it('rejects nested update acceptance criteria without description', async () => {
      const errors = await validateDto(UpdateMilestoneDto, {
        acceptanceCriteria: [{ required: true }],
      });

      expect(
        errors.find((error) => error.property === 'acceptanceCriteria'),
      ).toBeDefined();
    });

    it('rejects revisionLimit below 1', async () => {
      const errors = await validateDto(UpdateMilestoneDto, {
        revisionLimit: 0,
      });

      expect(constraintsFor(errors, 'revisionLimit')).toHaveProperty('min');
    });

    it('rejects invalid update amount strings', async () => {
      const errors = await validateDto(UpdateMilestoneDto, {
        amount: '-10.00',
      });

      expect(constraintsFor(errors, 'amount')).toHaveProperty('matches');
    });
  });

  describe('ReorderMilestonesDto', () => {
    it('accepts a valid reorder payload', async () => {
      const errors = await validateDto(ReorderMilestonesDto, {
        milestones: [
          {
            milestoneId: '11111111-1111-4111-8111-111111111111',
            orderIndex: 1,
          },
          {
            milestoneId: '22222222-2222-4222-8222-222222222222',
            orderIndex: 2,
          },
        ],
      });

      expect(errors).toHaveLength(0);
    });

    it('rejects empty reorder arrays', async () => {
      const errors = await validateDto(ReorderMilestonesDto, {
        milestones: [],
      });

      expect(constraintsFor(errors, 'milestones')).toHaveProperty(
        'arrayMinSize',
      );
    });

    it('rejects malformed milestone IDs', async () => {
      const errors = await validateDto(ReorderMilestonesDto, {
        milestones: [{ milestoneId: 'not-a-uuid', orderIndex: 1 }],
      });

      expect(
        errors.find((error) => error.property === 'milestones'),
      ).toBeDefined();
    });

    it('rejects reorder items with orderIndex below 1', async () => {
      const errors = await validateDto(ReorderMilestonesDto, {
        milestones: [
          {
            milestoneId: '11111111-1111-4111-8111-111111111111',
            orderIndex: 0,
          },
        ],
      });

      expect(
        errors.find((error) => error.property === 'milestones'),
      ).toBeDefined();
    });
  });
});
