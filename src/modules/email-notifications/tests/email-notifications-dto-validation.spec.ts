import { NotificationStatus, NotificationType } from '@prisma/client';
import {
  validateDto,
  findPropertyError,
} from './email-notifications-dto-test-helpers';
import { PreviewEmailDto } from '../dto/preview-email.dto';
import { SendTestNotificationDto } from '../dto/send-test-notification.dto';
import { EmailLogQueryDto } from '../dto/email-log-query.dto';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';
const validEmail = 'client@example.com';

// ---------------------------------------------------------------------------
// PreviewEmailDto
// ---------------------------------------------------------------------------
describe('PreviewEmailDto validation', () => {
  it('accepts valid Arabic agreement invite preview', async () => {
    const errors = await validateDto(PreviewEmailDto, {
      type: NotificationType.AGREEMENT_INVITE,
      agreementId: validUuid,
      locale: 'ar',
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts valid English preview', async () => {
    const errors = await validateDto(PreviewEmailDto, {
      type: NotificationType.AGREEMENT_INVITE,
      agreementId: validUuid,
      locale: 'en',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid notification type', async () => {
    const errors = await validateDto(PreviewEmailDto, {
      type: 'INVALID_TYPE',
      agreementId: validUuid,
    });
    findPropertyError(errors, 'type');
  });

  it('rejects missing notification type', async () => {
    const errors = await validateDto(PreviewEmailDto, {
      agreementId: validUuid,
    });
    findPropertyError(errors, 'type');
  });

  it('rejects invalid agreementId', async () => {
    const errors = await validateDto(PreviewEmailDto, {
      type: NotificationType.AGREEMENT_INVITE,
      agreementId: 'not-a-uuid',
    });
    findPropertyError(errors, 'agreementId');
  });

  it('rejects missing agreementId', async () => {
    const errors = await validateDto(PreviewEmailDto, {
      type: NotificationType.AGREEMENT_INVITE,
    });
    findPropertyError(errors, 'agreementId');
  });

  it('rejects invalid locale', async () => {
    const errors = await validateDto(PreviewEmailDto, {
      type: NotificationType.AGREEMENT_INVITE,
      agreementId: validUuid,
      locale: 'fr',
    });
    findPropertyError(errors, 'locale');
  });

  it('accepts omitted locale (defaults to CLS / Arabic)', async () => {
    const errors = await validateDto(PreviewEmailDto, {
      type: NotificationType.AGREEMENT_INVITE,
      agreementId: validUuid,
    });
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// SendTestNotificationDto
// ---------------------------------------------------------------------------
describe('SendTestNotificationDto validation', () => {
  it('accepts valid system test notification', async () => {
    const errors = await validateDto(SendTestNotificationDto, {
      type: NotificationType.SYSTEM_TEST,
      recipientEmail: validEmail,
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts valid test with agreementId', async () => {
    const errors = await validateDto(SendTestNotificationDto, {
      type: NotificationType.AGREEMENT_INVITE,
      recipientEmail: validEmail,
      agreementId: validUuid,
      locale: 'en',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid recipient email', async () => {
    const errors = await validateDto(SendTestNotificationDto, {
      type: NotificationType.SYSTEM_TEST,
      recipientEmail: 'not-an-email',
    });
    findPropertyError(errors, 'recipientEmail');
  });

  it('rejects missing recipient email', async () => {
    const errors = await validateDto(SendTestNotificationDto, {
      type: NotificationType.SYSTEM_TEST,
    });
    findPropertyError(errors, 'recipientEmail');
  });

  it('rejects invalid notification type', async () => {
    const errors = await validateDto(SendTestNotificationDto, {
      type: 'INVALID_TYPE',
      recipientEmail: validEmail,
    });
    findPropertyError(errors, 'type');
  });

  it('rejects invalid agreementId', async () => {
    const errors = await validateDto(SendTestNotificationDto, {
      type: NotificationType.SYSTEM_TEST,
      recipientEmail: validEmail,
      agreementId: 'not-a-uuid',
    });
    findPropertyError(errors, 'agreementId');
  });

  it('rejects invalid locale', async () => {
    const errors = await validateDto(SendTestNotificationDto, {
      type: NotificationType.SYSTEM_TEST,
      recipientEmail: validEmail,
      locale: 'de',
    });
    findPropertyError(errors, 'locale');
  });
});

// ---------------------------------------------------------------------------
// EmailLogQueryDto
// ---------------------------------------------------------------------------
describe('EmailLogQueryDto validation', () => {
  it('accepts empty query (all optional)', async () => {
    const errors = await validateDto(EmailLogQueryDto, {});
    expect(errors).toHaveLength(0);
  });

  it('accepts valid type filter', async () => {
    const errors = await validateDto(EmailLogQueryDto, {
      type: NotificationType.AGREEMENT_INVITE,
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid type filter', async () => {
    const errors = await validateDto(EmailLogQueryDto, {
      type: 'INVALID_TYPE',
    });
    findPropertyError(errors, 'type');
  });

  it('accepts valid status filter', async () => {
    const errors = await validateDto(EmailLogQueryDto, {
      status: NotificationStatus.FAILED,
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid status filter', async () => {
    const errors = await validateDto(EmailLogQueryDto, {
      status: 'INVALID_STATUS',
    });
    findPropertyError(errors, 'status');
  });

  it('accepts valid agreementId filter', async () => {
    const errors = await validateDto(EmailLogQueryDto, {
      agreementId: validUuid,
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid agreementId filter', async () => {
    const errors = await validateDto(EmailLogQueryDto, {
      agreementId: 'not-a-uuid',
    });
    findPropertyError(errors, 'agreementId');
  });

  it('accepts valid recipientEmail filter', async () => {
    const errors = await validateDto(EmailLogQueryDto, {
      recipientEmail: validEmail,
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid recipientEmail filter', async () => {
    const errors = await validateDto(EmailLogQueryDto, {
      recipientEmail: 'not-an-email',
    });
    findPropertyError(errors, 'recipientEmail');
  });

  it('accepts valid ISO date range', async () => {
    const errors = await validateDto(EmailLogQueryDto, {
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-12-31T23:59:59.999Z',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid from date', async () => {
    const errors = await validateDto(EmailLogQueryDto, {
      from: 'not-a-date',
    });
    findPropertyError(errors, 'from');
  });

  it('rejects invalid to date', async () => {
    const errors = await validateDto(EmailLogQueryDto, {
      to: 'not-a-date',
    });
    findPropertyError(errors, 'to');
  });

  it('accepts valid page and limit', async () => {
    const errors = await validateDto(EmailLogQueryDto, {
      page: 1,
      limit: 20,
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts string page and limit (transformed by Type)', async () => {
    const errors = await validateDto(EmailLogQueryDto, {
      page: '2',
      limit: '50',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects page below 1', async () => {
    const errors = await validateDto(EmailLogQueryDto, {
      page: 0,
    });
    findPropertyError(errors, 'page');
  });

  it('rejects limit below 1', async () => {
    const errors = await validateDto(EmailLogQueryDto, {
      limit: 0,
    });
    findPropertyError(errors, 'limit');
  });

  it('rejects limit above 100', async () => {
    const errors = await validateDto(EmailLogQueryDto, {
      limit: 101,
    });
    findPropertyError(errors, 'limit');
  });

  it('accepts full combined query', async () => {
    const errors = await validateDto(EmailLogQueryDto, {
      type: NotificationType.PAYMENT_RELEASED,
      status: NotificationStatus.SENT,
      agreementId: validUuid,
      recipientEmail: validEmail,
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-12-31T23:59:59.999Z',
      page: 1,
      limit: 50,
    });
    expect(errors).toHaveLength(0);
  });
});
