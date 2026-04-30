import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AcceptDeliveryDto } from '../dto/accept-delivery.dto';
import { RequestDeliveryChangesDto } from '../dto/request-delivery-changes.dto';

describe('AcceptDeliveryDto', () => {
  it('should accept an empty body (all fields optional)', async () => {
    const dto = plainToInstance(AcceptDeliveryDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept an optional acceptance note', async () => {
    const dto = plainToInstance(AcceptDeliveryDto, {
      note: 'Approved. Please keep the editable source files available.',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject note exceeding 1000 characters', async () => {
    const dto = plainToInstance(AcceptDeliveryDto, {
      note: 'A'.repeat(1001),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('RequestDeliveryChangesDto', () => {
  it('should validate a valid request payload', async () => {
    const dto = plainToInstance(RequestDeliveryChangesDto, {
      reason: 'The mobile navigation and portfolio section need adjustment.',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate with optional requested criteria', async () => {
    const dto = plainToInstance(RequestDeliveryChangesDto, {
      reason: 'The mobile navigation and portfolio section need adjustment.',
      requestedCriteria: ['Mobile navigation', 'Portfolio section'],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject missing reason', async () => {
    const dto = plainToInstance(RequestDeliveryChangesDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'reason')).toBe(true);
  });

  it('should reject reason shorter than 10 characters', async () => {
    const dto = plainToInstance(RequestDeliveryChangesDto, {
      reason: 'Too short',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject reason longer than 2000 characters', async () => {
    const dto = plainToInstance(RequestDeliveryChangesDto, {
      reason: 'A'.repeat(2001),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject requestedCriteria items exceeding 160 characters', async () => {
    const dto = plainToInstance(RequestDeliveryChangesDto, {
      reason: 'The mobile navigation and portfolio section need adjustment.',
      requestedCriteria: ['A'.repeat(161)],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
