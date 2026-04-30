import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateDeliveryDto } from '../dto/update-delivery.dto';
import { SubmitDeliveryDto } from '../dto/submit-delivery.dto';

describe('UpdateDeliveryDto', () => {
  it('should accept an empty update payload (all fields optional)', async () => {
    const dto = plainToInstance(UpdateDeliveryDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept partial deliveryUrl update', async () => {
    const dto = plainToInstance(UpdateDeliveryDto, {
      deliveryUrl: 'https://example.com/deliveries/revision-2',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept partial summary update', async () => {
    const dto = plainToInstance(UpdateDeliveryDto, {
      summary: 'Updated assets and fixed the mobile spacing issue.',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject invalid deliveryUrl in update', async () => {
    const dto = plainToInstance(UpdateDeliveryDto, {
      deliveryUrl: 'not-a-url',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject summary shorter than 10 characters in update', async () => {
    const dto = plainToInstance(UpdateDeliveryDto, {
      summary: 'Short.',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject summary longer than 2000 characters in update', async () => {
    const dto = plainToInstance(UpdateDeliveryDto, {
      summary: 'A'.repeat(2001),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('SubmitDeliveryDto', () => {
  it('should accept an empty submit payload', async () => {
    const dto = plainToInstance(SubmitDeliveryDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept valid submittedAt ISO timestamp', async () => {
    const dto = plainToInstance(SubmitDeliveryDto, {
      submittedAt: '2026-04-29T12:00:00.000Z',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject invalid submittedAt date string', async () => {
    const dto = plainToInstance(SubmitDeliveryDto, {
      submittedAt: 'not-a-date',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept valid noteToClient', async () => {
    const dto = plainToInstance(SubmitDeliveryDto, {
      noteToClient: 'Please review the responsive behavior on tablet.',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject noteToClient exceeding 1000 characters', async () => {
    const dto = plainToInstance(SubmitDeliveryDto, {
      noteToClient: 'A'.repeat(1001),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
