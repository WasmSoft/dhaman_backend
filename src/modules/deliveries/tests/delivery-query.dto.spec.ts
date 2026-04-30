import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { DeliveryQueryDto } from '../dto/delivery-query.dto';

describe('DeliveryQueryDto', () => {
  it('should accept an empty query', async () => {
    const dto = plainToInstance(DeliveryQueryDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept valid agreementId UUID filter', async () => {
    const dto = plainToInstance(DeliveryQueryDto, {
      agreementId: 'f7c5b8d4-2c1a-4d2c-9d5e-2a4b6c8d0e2f',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject non-UUID agreementId filter', async () => {
    const dto = plainToInstance(DeliveryQueryDto, {
      agreementId: 'not-a-valid-uuid',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept valid milestoneId UUID filter', async () => {
    const dto = plainToInstance(DeliveryQueryDto, {
      milestoneId: 'a1b2c3d4-e5f6-4890-9234-567890abcdef',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept valid delivery status filter', async () => {
    const dto = plainToInstance(DeliveryQueryDto, {
      status: 'SUBMITTED',
    });
    const errors = await validate(dto);
    // class-transformer won't convert string to enum automatically,
    // but IsEnum should still validate the string value
    expect(errors.length).toBe(0);
  });

  it('should reject invalid delivery status value', async () => {
    const dto = plainToInstance(DeliveryQueryDto, {
      status: 'INVALID_STATUS',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept valid page and limit', async () => {
    const dto = plainToInstance(DeliveryQueryDto, {
      page: 1,
      limit: 20,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject page below 1', async () => {
    const dto = plainToInstance(DeliveryQueryDto, {
      page: 0,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject limit above 100', async () => {
    const dto = plainToInstance(DeliveryQueryDto, {
      limit: 101,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject non-integer page', async () => {
    const dto = plainToInstance(DeliveryQueryDto, {
      page: 1.5,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept all filters combined', async () => {
    const dto = plainToInstance(DeliveryQueryDto, {
      agreementId: 'f7c5b8d4-2c1a-4d2c-9d5e-2a4b6c8d0e2f',
      milestoneId: 'a1b2c3d4-e5f6-4890-9234-567890abcdef',
      status: 'CHANGES_REQUESTED',
      page: 2,
      limit: 50,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
