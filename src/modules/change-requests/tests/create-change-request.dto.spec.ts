import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateChangeRequestDto } from '../dto/create-change-request.dto';

describe('CreateChangeRequestDto', () => {
  it('should validate a valid minimal payload', async () => {
    const dto = plainToInstance(CreateChangeRequestDto, {
      title: 'Add extra landing page',
      description:
        'Client needs an additional landing page with hero section and contact form.',
      amount: '500.00',
      currency: 'USD',
      acceptanceCriteria: ['Landing page delivered', 'Hero section included'],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate a valid full payload with optional fields', async () => {
    const dto = plainToInstance(CreateChangeRequestDto, {
      title: 'Add extra landing page',
      description:
        'Client needs an additional landing page with hero section and contact form.',
      amount: '500.00',
      currency: 'USD',
      acceptanceCriteria: ['Landing page delivered', 'Hero section included'],
      milestoneId: '123e4567-e89b-12d3-a456-426614174000',
      aiReviewId: '223e4567-e89b-12d3-a456-426614174001',
      timelineDays: 7,
      additionalTimelineText: 'Requires 1 week extra',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject title below MinLength(3)', async () => {
    const dto = plainToInstance(CreateChangeRequestDto, {
      title: 'AB',
      description:
        'Client needs an additional landing page with hero section and contact form.',
      amount: '500.00',
      currency: 'USD',
      acceptanceCriteria: ['Landing page delivered'],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('should reject title above MaxLength(160)', async () => {
    const dto = plainToInstance(CreateChangeRequestDto, {
      title: 'A'.repeat(161),
      description:
        'Client needs an additional landing page with hero section and contact form.',
      amount: '500.00',
      currency: 'USD',
      acceptanceCriteria: ['Landing page delivered'],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('should reject description below MinLength(10)', async () => {
    const dto = plainToInstance(CreateChangeRequestDto, {
      title: 'Add extra landing page',
      description: 'Short.',
      amount: '500.00',
      currency: 'USD',
      acceptanceCriteria: ['Landing page delivered'],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'description')).toBe(true);
  });

  it('should reject description above MaxLength(3000)', async () => {
    const dto = plainToInstance(CreateChangeRequestDto, {
      title: 'Add extra landing page',
      description: 'A'.repeat(3001),
      amount: '500.00',
      currency: 'USD',
      acceptanceCriteria: ['Landing page delivered'],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'description')).toBe(true);
  });

  it('should reject empty acceptanceCriteria array', async () => {
    const dto = plainToInstance(CreateChangeRequestDto, {
      title: 'Add extra landing page',
      description:
        'Client needs an additional landing page with hero section and contact form.',
      amount: '500.00',
      currency: 'USD',
      acceptanceCriteria: [],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'acceptanceCriteria')).toBe(true);
  });

  it('should reject missing acceptanceCriteria', async () => {
    const dto = plainToInstance(CreateChangeRequestDto, {
      title: 'Add extra landing page',
      description:
        'Client needs an additional landing page with hero section and contact form.',
      amount: '500.00',
      currency: 'USD',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'acceptanceCriteria')).toBe(true);
  });

  it('should reject non-UUID milestoneId', async () => {
    const dto = plainToInstance(CreateChangeRequestDto, {
      title: 'Add extra landing page',
      description:
        'Client needs an additional landing page with hero section and contact form.',
      amount: '500.00',
      currency: 'USD',
      acceptanceCriteria: ['Landing page delivered'],
      milestoneId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'milestoneId')).toBe(true);
  });

  it('should reject non-UUID aiReviewId', async () => {
    const dto = plainToInstance(CreateChangeRequestDto, {
      title: 'Add extra landing page',
      description:
        'Client needs an additional landing page with hero section and contact form.',
      amount: '500.00',
      currency: 'USD',
      acceptanceCriteria: ['Landing page delivered'],
      aiReviewId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'aiReviewId')).toBe(true);
  });

  it('should reject timelineDays as zero (Min(1) enforced)', async () => {
    const dto = plainToInstance(CreateChangeRequestDto, {
      title: 'Add extra landing page',
      description:
        'Client needs an additional landing page with hero section and contact form.',
      amount: '500.00',
      currency: 'USD',
      acceptanceCriteria: ['Landing page delivered'],
      timelineDays: 0,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'timelineDays')).toBe(true);
  });

  it('should accept absent timelineDays without error', async () => {
    const dto = plainToInstance(CreateChangeRequestDto, {
      title: 'Add extra landing page',
      description:
        'Client needs an additional landing page with hero section and contact form.',
      amount: '500.00',
      currency: 'USD',
      acceptanceCriteria: ['Landing page delivered'],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'timelineDays')).toBe(false);
  });
});
