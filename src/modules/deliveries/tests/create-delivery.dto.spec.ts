import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateDeliveryDto } from '../dto/create-delivery.dto';

describe('CreateDeliveryDto', () => {
  it('should validate a valid payload', async () => {
    const dto = plainToInstance(CreateDeliveryDto, {
      summary:
        'Completed the homepage redesign with responsive navigation and final assets.',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate a full optional payload', async () => {
    const dto = plainToInstance(CreateDeliveryDto, {
      deliveryUrl: 'https://example.com/deliveries/preview',
      fileUrl: 'https://cdn.example.com/files/logo-package.zip',
      fileName: 'logo-package.zip',
      fileType: 'application/zip',
      summary: 'Completed the homepage redesign with responsive navigation.',
      notes: 'Source files included.',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject missing summary', async () => {
    const dto = plainToInstance(CreateDeliveryDto, {
      deliveryUrl: 'https://example.com/deliveries/preview',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'summary')).toBe(true);
  });

  it('should reject summary shorter than 10 characters', async () => {
    const dto = plainToInstance(CreateDeliveryDto, {
      summary: 'Short.',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject summary longer than 2000 characters', async () => {
    const dto = plainToInstance(CreateDeliveryDto, {
      summary: 'A'.repeat(2001),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject invalid deliveryUrl', async () => {
    const dto = plainToInstance(CreateDeliveryDto, {
      deliveryUrl: 'not-a-url',
      summary: 'Completed the homepage redesign with responsive navigation.',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'deliveryUrl')).toBe(true);
  });

  it('should reject invalid fileUrl', async () => {
    const dto = plainToInstance(CreateDeliveryDto, {
      fileUrl: 'not-a-url',
      summary: 'Completed the homepage redesign with responsive navigation.',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'fileUrl')).toBe(true);
  });

  it('should reject fileName exceeding 255 characters', async () => {
    const dto = plainToInstance(CreateDeliveryDto, {
      fileName: 'A'.repeat(256),
      summary: 'Completed the homepage redesign with responsive navigation.',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject fileType exceeding 100 characters', async () => {
    const dto = plainToInstance(CreateDeliveryDto, {
      fileType: 'A'.repeat(101),
      summary: 'Completed the homepage redesign with responsive navigation.',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject notes exceeding 2000 characters', async () => {
    const dto = plainToInstance(CreateDeliveryDto, {
      notes: 'A'.repeat(2001),
      summary: 'Completed the homepage redesign with responsive navigation.',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept empty optional fields without validation errors', async () => {
    const dto = plainToInstance(CreateDeliveryDto, {
      summary: 'Completed the homepage redesign with responsive navigation.',
      deliveryUrl: undefined,
      fileUrl: undefined,
      fileName: undefined,
      fileType: undefined,
      notes: undefined,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
