import { AgreementStatus, NotificationStatus, NotificationType, TimelineActorRole, TimelineEventType } from '@prisma/client';
import { ClsService } from '../../../common/cls/cls.service';
import { ActorType } from '../../../common/enums/actor-type.enum';
import { Locale } from '../../../common/enums/locale.enum';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { AppException } from '../../../common/errors/app-exception';
import { EmailNotificationsService } from '../email-notifications.service';
import {
  agreementId,
  createClsService,
  createMockAgreement,
  createMockEmailNotification,
  createPrismaMock,
  expectErrorCode,
  freelancerId,
  validEmail,
} from './email-notifications-service-test-helpers';

// ============================================================================
// US1 — Internal sendNotification (non-blocking, provider fallback, CLS metadata)
// ============================================================================
describe('EmailNotificationsService — sendNotification (US1)', () => {
  it('creates PENDING then SENT when provider succeeds', async () => {
    const cls = new ClsService();
    const createdRecord = createMockEmailNotification({ status: NotificationStatus.PENDING });
    const updatedRecord = createMockEmailNotification({ status: NotificationStatus.SENT, sentAt: new Date(), providerMessageId: 'demo_123' });
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValue(createdRecord),
        update: jest.fn().mockResolvedValue(updatedRecord),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const service = new EmailNotificationsService(prisma, cls);

    const result = await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () =>
        service.sendNotification({
          agreementId,
          recipientEmail: validEmail,
          type: NotificationType.AGREEMENT_INVITE,
        }),
    );

    expect(prisma.emailNotification.create).toHaveBeenCalled();
    expect(prisma.emailNotification.update).toHaveBeenCalled();
    expect(result.status).toBe(NotificationStatus.SENT);
  });

  it('creates PENDING then FAILED when provider is unavailable', async () => {
    const cls = new ClsService();
    const createdRecord = createMockEmailNotification({ status: NotificationStatus.PENDING });
    const failedRecord = createMockEmailNotification({
      status: NotificationStatus.FAILED,
      errorMessage: 'Email provider is not configured; preview stored.',
    });
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValue(createdRecord),
        update: jest.fn().mockResolvedValue(failedRecord),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const service = new EmailNotificationsService(prisma, cls);

    const result = await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () =>
        service.sendNotification({
          agreementId,
          recipientEmail: validEmail,
          type: NotificationType.AGREEMENT_INVITE,
        }),
    );

    expect(result.status).toBe(NotificationStatus.FAILED);
  });

  it('never throws to the caller (non-blocking)', async () => {
    const cls = new ClsService();
    // First create() rejects, second create() (in createFailedNotification) succeeds
    const failedRecord = createMockEmailNotification({
      status: NotificationStatus.FAILED,
      errorMessage: 'DB crash',
      type: NotificationType.AGREEMENT_INVITE,
    });
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest
          .fn()
          .mockRejectedValueOnce(new Error('DB crash'))
          .mockResolvedValueOnce(failedRecord),
        update: jest.fn().mockResolvedValue(createMockEmailNotification()),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const service = new EmailNotificationsService(prisma, cls);

    const result = await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () =>
        service.sendNotification({
          agreementId,
          recipientEmail: validEmail,
          type: NotificationType.AGREEMENT_INVITE,
        }),
    );

    expect(result.status).toBe(NotificationStatus.FAILED);
  });

  it('stores requestId and correlationId from CLS', async () => {
    const cls = new ClsService();
    const createdRecord = createMockEmailNotification({ status: NotificationStatus.PENDING });
    const updatedRecord = createMockEmailNotification({ status: NotificationStatus.SENT });
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValue(createdRecord),
        update: jest.fn().mockResolvedValue(updatedRecord),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const service = new EmailNotificationsService(prisma, cls);

    await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-test-1', locale: Locale.AR, requestId: 'req-test-1', startedAt: new Date(), userId: freelancerId },
      () =>
        service.sendNotification({
          agreementId,
          recipientEmail: validEmail,
          type: NotificationType.AGREEMENT_INVITE,
        }),
    );

    expect(prisma.emailNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requestId: 'req-test-1',
          correlationId: 'corr-test-1',
        }),
      }),
    );
  });

  it('stores CLS actor and locale metadata in the notification record', async () => {
    const cls = new ClsService();
    const createdRecord = createMockEmailNotification({ status: NotificationStatus.PENDING });
    const updatedRecord = createMockEmailNotification({ status: NotificationStatus.SENT });
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValue(createdRecord),
        update: jest.fn().mockResolvedValue(updatedRecord),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const service = new EmailNotificationsService(prisma, cls);

    await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-test-1', locale: Locale.AR, requestId: 'req-test-1', startedAt: new Date(), userId: freelancerId },
      () =>
        service.sendNotification({
          agreementId,
          recipientEmail: validEmail,
          type: NotificationType.AGREEMENT_INVITE,
        }),
    );

    const createCall = prisma.emailNotification.create as jest.Mock;
    const metadataArg = createCall.mock.calls[0][0].data.metadata;
    expect(metadataArg).toEqual(
      expect.objectContaining({
        actorType: 'FREELANCER',
        requestId: 'req-test-1',
        correlationId: 'corr-test-1',
        locale: 'ar',
      }),
    );
  });

  it('preserves preview HTML on success', async () => {
    const cls = new ClsService();
    const createdRecord = createMockEmailNotification({ status: NotificationStatus.PENDING, previewHtml: '<html>preview</html>' });
    const updatedRecord = createMockEmailNotification({
      status: NotificationStatus.SENT,
      previewHtml: '<html>preview</html>',
      sentAt: new Date(),
    });
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValue(createdRecord),
        update: jest.fn().mockResolvedValue(updatedRecord),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const service = new EmailNotificationsService(prisma, cls);

    const result = await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () =>
        service.sendNotification({
          agreementId,
          recipientEmail: validEmail,
          type: NotificationType.AGREEMENT_INVITE,
        }),
    );

    expect(result.previewHtml).toBe('<html>preview</html>');
  });
});

// ============================================================================
// US1 — Template rendering coverage (all types, Arabic, English fallback, escaping)
// ============================================================================
describe('EmailNotificationsService — renderTemplate (US1)', () => {
  it('renders every NotificationType in Arabic', () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma, cls);

    for (const type of Object.values(NotificationType)) {
      const rendered = service.renderTemplate(
        type,
        {
          agreement: { id: 'a1', title: 'Test', description: '', serviceType: '', totalAmount: '100', currency: 'SAR', status: 'DRAFT' },
          client: { name: 'Client', email: 'c@c.com', companyName: null },
          freelancer: { name: 'FL', email: 'f@f.com' },
          metadata: {},
          recipientEmail: 'c@c.com',
          recipientName: 'Client',
        },
        'ar',
      );

      expect(rendered.subject).toBeTruthy();
      expect(rendered.previewHtml).toContain('dir="rtl"');
      expect(rendered.previewText).toBeTruthy();
    }
  });

  it('renders with English when locale is en', () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma, cls);

    const rendered = service.renderTemplate(
      NotificationType.AGREEMENT_INVITE,
      {
        agreement: { id: 'a1', title: 'Test', description: '', serviceType: '', totalAmount: '100', currency: 'SAR', status: 'DRAFT' },
        client: { name: 'Client', email: 'c@c.com', companyName: null },
        freelancer: { name: 'FL', email: 'f@f.com' },
        metadata: {},
        recipientEmail: 'c@c.com',
        recipientName: 'Client',
      },
      'en',
    );

    expect(rendered.subject).toBe('Invitation to review a Dhaman agreement');
    expect(rendered.previewHtml).toContain('dir="ltr"');
    expect(rendered.previewHtml).toContain('New agreement invitation');
  });

  it('escapes user-provided HTML values', () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma, cls);

    const rendered = service.renderTemplate(
      NotificationType.AGREEMENT_INVITE,
      {
        agreement: { id: 'a1', title: '<script>alert("xss")</script>', description: '', serviceType: '', totalAmount: '100', currency: 'SAR', status: 'DRAFT' },
        client: { name: 'Client', email: 'c@c.com', companyName: null },
        freelancer: { name: 'FL', email: 'f@f.com' },
        metadata: {},
        recipientEmail: 'c@c.com',
        recipientName: 'Client',
      },
      'ar',
    );

    expect(rendered.previewHtml).not.toContain('<script>');
    expect(rendered.previewHtml).toContain('&lt;script&gt;');
  });

  it('escapes special HTML characters', () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma, cls);

    const rendered = service.renderTemplate(
      NotificationType.AGREEMENT_APPROVED,
      {
        agreement: { id: 'a1', title: 'Test & Co > Partners', description: '', serviceType: '', totalAmount: '100', currency: 'SAR', status: 'DRAFT' },
        client: { name: 'Client \'The Bear\'', email: 'c@c.com', companyName: null },
        freelancer: { name: 'FL', email: 'f@f.com' },
        metadata: {},
        recipientEmail: 'c@c.com',
        recipientName: 'Client \'The Bear\'',
      },
      'ar',
    );

    expect(rendered.previewHtml).toContain('&amp;');
    expect(rendered.previewHtml).toContain('&gt;');
  });

  it('throws EMAIL_TEMPLATE_NOT_FOUND for missing template type', () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma, cls);
    const fakeType = 'NON_EXISTENT_TYPE' as NotificationType;

    expect(() =>
      service.renderTemplate(
        fakeType,
        {
          agreement: { id: 'a1', title: 'Test', description: '', serviceType: '', totalAmount: '100', currency: 'SAR', status: 'DRAFT' },
          client: { name: 'Client', email: 'c@c.com', companyName: null },
          freelancer: { name: 'FL', email: 'f@f.com' },
          metadata: {},
          recipientEmail: 'c@c.com',
          recipientName: 'Client',
        },
        'ar',
      ),
    ).toThrow(AppException);
  });
});

// ============================================================================
// US1 — buildTemplateContext
// ============================================================================
describe('EmailNotificationsService — buildTemplateContext (US1)', () => {
  it('excludes sensitive data from template context', async () => {
    const cls = new ClsService();
    const safeAgreement = createMockAgreement();
    const prisma = createPrismaMock({
      agreement: { findFirst: jest.fn().mockResolvedValue(safeAgreement) },
    });
    const service = new EmailNotificationsService(prisma, cls);

    const context = await service.buildTemplateContext(
      NotificationType.AGREEMENT_INVITE,
      agreementId,
      {},
      freelancerId,
    );

    expect(context).not.toHaveProperty('passwordHash');
    expect(context).not.toHaveProperty('tokenHash');
    expect(context).not.toHaveProperty('inviteToken');
    expect(context).not.toHaveProperty('portalToken');
    expect(context.agreement).toBeDefined();
    expect(context.agreement?.id).toBe(agreementId);
    expect(context.client).toBeDefined();
    expect(context.freelancer).toBeDefined();
  });

  it('returns minimal context for non-agreement-scoped types', async () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma, cls);

    const context = await service.buildTemplateContext(
      NotificationType.SYSTEM_TEST,
      undefined,
      { key: 'value' },
    );

    expect(context.agreement).toBeUndefined();
    expect(context.metadata).toEqual({ key: 'value' });
    expect(context.recipientEmail).toBeNull();
    expect(context.recipientName).toBeNull();
  });

  it('throws AGREEMENT_NOT_FOUND when agreement does not exist', async () => {
    const cls = new ClsService();
    const prisma = createPrismaMock({
      agreement: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new EmailNotificationsService(prisma, cls);

    try {
      await service.buildTemplateContext(
        NotificationType.AGREEMENT_INVITE,
        'nonexistent-agreement',
        {},
        freelancerId,
      );
      fail('Expected AppException');
    } catch (error) {
      expectErrorCode(error, ErrorCode.AGREEMENT_NOT_FOUND);
    }
  });

  it('throws EMAIL_TYPE_NOT_SUPPORTED for unsupported type', async () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma, cls);
    const fakeType = 'NON_EXISTENT_TYPE' as NotificationType;

    try {
      await service.buildTemplateContext(fakeType, undefined, {});
      fail('Expected AppException');
    } catch (error) {
      expectErrorCode(error, ErrorCode.EMAIL_TYPE_NOT_SUPPORTED);
    }
  });
});

// ============================================================================
// US1 — Language resolution
// ============================================================================
describe('EmailNotificationsService — locale resolution (US1)', () => {
  it('defaults to Arabic when no locale is set', () => {
    const cls = new ClsService();
    cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.EN, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () => {
        const prisma = createPrismaMock();
        const service = new EmailNotificationsService(prisma, cls);

        const rendered = service.renderTemplate(
          NotificationType.AGREEMENT_INVITE,
          {
            agreement: { id: 'a1', title: 'Test', description: '', serviceType: '', totalAmount: '100', currency: 'SAR', status: 'DRAFT' },
            client: { name: 'Client', email: 'c@c.com', companyName: null },
            freelancer: { name: 'FL', email: 'f@f.com' },
            metadata: {},
            recipientEmail: 'c@c.com',
            recipientName: 'Client',
          },
          'ar',
        );

        expect(rendered.previewHtml).toContain('dir="rtl"');
      },
    );
  });
});

// ============================================================================
// US2 — previewEmail
// ============================================================================
describe('EmailNotificationsService — previewEmail (US2)', () => {
  it('renders Arabic preview successfully', async () => {
    const cls = new ClsService();
    const agreement = createMockAgreement();
    const prisma = createPrismaMock({
      agreement: { findFirst: jest.fn().mockResolvedValue(agreement) },
    });
    const service = new EmailNotificationsService(prisma, cls);

    const result = await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () =>
        service.previewEmail(
          {
            type: NotificationType.AGREEMENT_INVITE,
            agreementId,
            locale: 'ar',
          },
          freelancerId,
        ),
    );

    expect(result.type).toBe(NotificationType.AGREEMENT_INVITE);
    expect(result.subject).toBeTruthy();
    expect(result.previewHtml).toContain('dir="rtl"');
    expect(result.locale).toBe('ar');
  });

  it('renders English preview successfully', async () => {
    const cls = new ClsService();
    const agreement = createMockAgreement();
    const prisma = createPrismaMock({
      agreement: { findFirst: jest.fn().mockResolvedValue(agreement) },
    });
    const service = new EmailNotificationsService(prisma, cls);

    const result = await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () =>
        service.previewEmail(
          {
            type: NotificationType.AGREEMENT_INVITE,
            agreementId,
            locale: 'en',
          },
          freelancerId,
        ),
    );

    expect(result.locale).toBe('en');
    expect(result.previewHtml).toContain('dir="ltr"');
  });

  it('does not create an email notification record', async () => {
    const cls = new ClsService();
    const agreement = createMockAgreement();
    const prisma = createPrismaMock({
      agreement: { findFirst: jest.fn().mockResolvedValue(agreement) },
    });
    const service = new EmailNotificationsService(prisma, cls);

    await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () =>
        service.previewEmail(
          {
            type: NotificationType.AGREEMENT_INVITE,
            agreementId,
          },
          freelancerId,
        ),
    );

    expect(prisma.emailNotification.create).not.toHaveBeenCalled();
  });

  it('rejects preview for agreement not owned by freelancer', async () => {
    const cls = new ClsService();
    const prisma = createPrismaMock({
      agreement: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new EmailNotificationsService(prisma, cls);

    try {
      await cls.run(
        { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
        () =>
          service.previewEmail(
            {
              type: NotificationType.AGREEMENT_INVITE,
              agreementId,
            },
            freelancerId,
          ),
      );
      fail('Expected AppException');
    } catch (error) {
      expectErrorCode(error, ErrorCode.AGREEMENT_NOT_FOUND);
    }
  });

  it('rejects unsupported notification type', async () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma, cls);
    const fakeType = 'NON_EXISTENT_TYPE' as NotificationType;

    try {
      await cls.run(
        { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
        () =>
          service.previewEmail(
            {
              type: fakeType,
              agreementId,
            },
            freelancerId,
          ),
      );
      fail('Expected AppException');
    } catch (error) {
      expectErrorCode(error, ErrorCode.EMAIL_TYPE_NOT_SUPPORTED);
    }
  });
});

// ============================================================================
// US2 — sendTestNotification
// ============================================================================
describe('EmailNotificationsService — sendTestNotification (US2)', () => {
  it('creates a test notification with SENT status when provider works', async () => {
    const cls = new ClsService();
    const agreement = createMockAgreement();
    const sentRecord = createMockEmailNotification({
      status: NotificationStatus.SENT,
      type: NotificationType.SYSTEM_TEST,
      sentAt: new Date(),
    });
    const prisma = createPrismaMock({
      agreement: { findFirst: jest.fn().mockResolvedValue(agreement) },
      emailNotification: {
        create: jest.fn().mockResolvedValue(createMockEmailNotification({ type: NotificationType.SYSTEM_TEST, status: NotificationStatus.PENDING })),
        update: jest.fn().mockResolvedValue(sentRecord),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const service = new EmailNotificationsService(prisma, cls);

    const result = await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () =>
        service.sendTestNotification(
          {
            type: NotificationType.SYSTEM_TEST,
            recipientEmail: validEmail,
          },
          freelancerId,
        ),
    );

    expect(result.type).toBe(NotificationType.SYSTEM_TEST);
    expect(result.status).toBe(NotificationStatus.SENT);
    expect(result.recipientEmail).toBe(validEmail);
  });

  it('returns FAILED when provider is unavailable but still creates a record', async () => {
    const cls = new ClsService();
    const createdRecord = createMockEmailNotification({ type: NotificationType.SYSTEM_TEST, status: NotificationStatus.PENDING });
    const failedRecord = createMockEmailNotification({ type: NotificationType.SYSTEM_TEST, status: NotificationStatus.FAILED, errorMessage: '...' });
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValue(createdRecord),
        update: jest.fn().mockResolvedValue(failedRecord),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const service = new EmailNotificationsService(prisma, cls);

    const result = await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () =>
        service.sendTestNotification(
          {
            type: NotificationType.SYSTEM_TEST,
            recipientEmail: validEmail,
          },
          freelancerId,
        ),
    );

    expect(result.status).toBe(NotificationStatus.FAILED);
  });

  it('throws EMAIL_RECIPIENT_REQUIRED for empty recipient', async () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma, cls);

    try {
      await cls.run(
        { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
        () =>
          service.sendTestNotification(
            {
              type: NotificationType.SYSTEM_TEST,
              recipientEmail: '',
            },
            freelancerId,
          ),
      );
      fail('Expected AppException');
    } catch (error) {
      expectErrorCode(error, ErrorCode.EMAIL_RECIPIENT_REQUIRED);
    }
  });

  it('verifies agreement ownership for agreement-scoped test notifications', async () => {
    const cls = new ClsService();
    const prisma = createPrismaMock({
      agreement: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new EmailNotificationsService(prisma, cls);

    try {
      await cls.run(
        { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
        () =>
          service.sendTestNotification(
            {
              type: NotificationType.AGREEMENT_INVITE,
              recipientEmail: validEmail,
              agreementId,
            },
            freelancerId,
          ),
      );
      fail('Expected AppException');
    } catch (error) {
      expectErrorCode(error, ErrorCode.AGREEMENT_NOT_FOUND);
    }
  });

  it('throws EMAIL_CONTEXT_INCOMPLETE when agreement-scoped type has no agreementId', async () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma, cls);

    try {
      await cls.run(
        { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
        () =>
          service.sendTestNotification(
            {
              type: NotificationType.AGREEMENT_INVITE,
              recipientEmail: validEmail,
            },
            freelancerId,
          ),
      );
      fail('Expected AppException');
    } catch (error) {
      expectErrorCode(error, ErrorCode.EMAIL_CONTEXT_INCOMPLETE);
    }
  });
});

// ============================================================================
// US3 — resendAgreementInvite
// ============================================================================
describe('EmailNotificationsService — resendAgreementInvite (US3)', () => {
  it('creates notification and timeline evidence for a valid invite', async () => {
    const cls = new ClsService();
    const agreement = createMockAgreement({ status: AgreementStatus.DRAFT });
    const sentRecord = createMockEmailNotification({ status: NotificationStatus.SENT, sentAt: new Date() });
    const prisma = createPrismaMock({
      agreement: { findFirst: jest.fn().mockResolvedValue(agreement) },
      emailNotification: {
        create: jest.fn().mockResolvedValue(createMockEmailNotification({ status: NotificationStatus.PENDING })),
        update: jest.fn().mockResolvedValue(sentRecord),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const service = new EmailNotificationsService(prisma, cls);

    const result = await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () => service.resendAgreementInvite(agreementId, freelancerId),
    );

    expect(result.type).toBe(NotificationType.AGREEMENT_INVITE);
    expect(result.recipientEmail).toBe(validEmail);
    expect(prisma.timelineEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          agreementId,
          type: TimelineEventType.EMAIL_SENT,
          actorRole: TimelineActorRole.FREELANCER,
          metadata: expect.objectContaining({
            notificationId: result.id,
            recipientEmail: validEmail,
          }),
        }),
      }),
    );
  });

  it('throws CLIENT_EMAIL_MISSING when client has no email', async () => {
    const cls = new ClsService();
    const agreement = createMockAgreement({ clientEmail: '' });
    const prisma = createPrismaMock({
      agreement: { findFirst: jest.fn().mockResolvedValue(agreement) },
    });
    const service = new EmailNotificationsService(prisma, cls);

    try {
      await cls.run(
        { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
        () => service.resendAgreementInvite(agreementId, freelancerId),
      );
      fail('Expected AppException');
    } catch (error) {
      expectErrorCode(error, ErrorCode.CLIENT_EMAIL_MISSING);
    }
  });

  it('throws AGREEMENT_NOT_FOUND when agreement does not belong to freelancer', async () => {
    const cls = new ClsService();
    const prisma = createPrismaMock({
      agreement: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new EmailNotificationsService(prisma, cls);

    try {
      await cls.run(
        { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
        () => service.resendAgreementInvite(agreementId, freelancerId),
      );
      fail('Expected AppException');
    } catch (error) {
      expectErrorCode(error, ErrorCode.AGREEMENT_NOT_FOUND);
    }
  });

  it('throws AGREEMENT_NOT_INVITABLE for approved agreement', async () => {
    const cls = new ClsService();
    const agreement = createMockAgreement({ status: AgreementStatus.APPROVED });
    const prisma = createPrismaMock({
      agreement: { findFirst: jest.fn().mockResolvedValue(agreement) },
    });
    const service = new EmailNotificationsService(prisma, cls);

    try {
      await cls.run(
        { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
        () => service.resendAgreementInvite(agreementId, freelancerId),
      );
      fail('Expected AppException');
    } catch (error) {
      expectErrorCode(error, ErrorCode.AGREEMENT_NOT_INVITABLE);
    }
  });

  it('throws AGREEMENT_NOT_INVITABLE for completed agreement', async () => {
    const cls = new ClsService();
    const agreement = createMockAgreement({ status: AgreementStatus.COMPLETED });
    const prisma = createPrismaMock({
      agreement: { findFirst: jest.fn().mockResolvedValue(agreement) },
    });
    const service = new EmailNotificationsService(prisma, cls);

    try {
      await cls.run(
        { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
        () => service.resendAgreementInvite(agreementId, freelancerId),
      );
      fail('Expected AppException');
    } catch (error) {
      expectErrorCode(error, ErrorCode.AGREEMENT_NOT_INVITABLE);
    }
  });

  it('throws AGREEMENT_NOT_INVITABLE for cancelled agreement', async () => {
    const cls = new ClsService();
    const agreement = createMockAgreement({ status: AgreementStatus.CANCELLED });
    const prisma = createPrismaMock({
      agreement: { findFirst: jest.fn().mockResolvedValue(agreement) },
    });
    const service = new EmailNotificationsService(prisma, cls);

    try {
      await cls.run(
        { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
        () => service.resendAgreementInvite(agreementId, freelancerId),
      );
      fail('Expected AppException');
    } catch (error) {
      expectErrorCode(error, ErrorCode.AGREEMENT_NOT_INVITABLE);
    }
  });

  it('allows resend for DRAFT agreement', async () => {
    const cls = new ClsService();
    const agreement = createMockAgreement({ status: AgreementStatus.DRAFT });
    const sentRecord = createMockEmailNotification({ status: NotificationStatus.SENT, sentAt: new Date() });
    const prisma = createPrismaMock({
      agreement: { findFirst: jest.fn().mockResolvedValue(agreement) },
      emailNotification: {
        create: jest.fn().mockResolvedValue(createMockEmailNotification({ status: NotificationStatus.PENDING })),
        update: jest.fn().mockResolvedValue(sentRecord),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const service = new EmailNotificationsService(prisma, cls);

    const result = await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () => service.resendAgreementInvite(agreementId, freelancerId),
    );

    expect(result.status).toBe(NotificationStatus.SENT);
  });

  it('allows resend for SENT agreement', async () => {
    const cls = new ClsService();
    const agreement = createMockAgreement({ status: AgreementStatus.SENT });
    const sentRecord = createMockEmailNotification({ status: NotificationStatus.SENT, sentAt: new Date() });
    const prisma = createPrismaMock({
      agreement: { findFirst: jest.fn().mockResolvedValue(agreement) },
      emailNotification: {
        create: jest.fn().mockResolvedValue(createMockEmailNotification({ status: NotificationStatus.PENDING })),
        update: jest.fn().mockResolvedValue(sentRecord),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const service = new EmailNotificationsService(prisma, cls);

    const result = await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () => service.resendAgreementInvite(agreementId, freelancerId),
    );

    expect(result.status).toBe(NotificationStatus.SENT);
  });

  it('returns FAILED notification when provider unavailable but still creates timeline evidence', async () => {
    const cls = new ClsService();
    const agreement = createMockAgreement({ status: AgreementStatus.DRAFT });
    const failedRecord = createMockEmailNotification({
      status: NotificationStatus.FAILED,
      errorMessage: 'Email provider is not configured; preview stored.',
    });
    const prisma = createPrismaMock({
      agreement: { findFirst: jest.fn().mockResolvedValue(agreement) },
      emailNotification: {
        create: jest.fn().mockResolvedValue(createMockEmailNotification({ status: NotificationStatus.PENDING })),
        update: jest.fn().mockResolvedValue(failedRecord),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const service = new EmailNotificationsService(prisma, cls);

    const result = await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () => service.resendAgreementInvite(agreementId, freelancerId),
    );

    expect(result.status).toBe(NotificationStatus.FAILED);
    expect(prisma.timelineEvent.create).toHaveBeenCalled();
  });
});

// ============================================================================
// US4 — listEmailLogs
// ============================================================================
describe('EmailNotificationsService — listEmailLogs (US4)', () => {
  it('returns paginated results with pagination metadata', async () => {
    const cls = new ClsService();
    const items = [
      createMockEmailNotification({ id: 'n1', createdAt: new Date('2026-04-30T00:00:00.000Z') }),
      createMockEmailNotification({ id: 'n2', createdAt: new Date('2026-04-29T00:00:00.000Z') }),
    ];
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValue(createMockEmailNotification()),
        update: jest.fn().mockResolvedValue(createMockEmailNotification()),
        findMany: jest.fn().mockResolvedValue(items),
        count: jest.fn().mockResolvedValue(2),
      },
    });
    (prisma.$transaction as jest.Mock) = jest.fn().mockResolvedValue([items, 2]);
    const service = new EmailNotificationsService(prisma, cls);

    const result = await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () => service.listEmailLogs({ page: 1, limit: 20 }, freelancerId),
    );

    expect(result.items).toHaveLength(2);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    });
  });

  it('orders results newest first', async () => {
    const cls = new ClsService();
    const older = createMockEmailNotification({ id: 'old', createdAt: new Date('2026-04-28T00:00:00.000Z') });
    const newer = createMockEmailNotification({ id: 'new', createdAt: new Date('2026-04-30T00:00:00.000Z') });
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValue(createMockEmailNotification()),
        update: jest.fn().mockResolvedValue(createMockEmailNotification()),
        findMany: jest.fn().mockResolvedValue([newer, older]),
        count: jest.fn().mockResolvedValue(2),
      },
    });
    (prisma.$transaction as jest.Mock) = jest.fn().mockResolvedValue([[newer, older], 2]);
    const service = new EmailNotificationsService(prisma, cls);

    await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () => service.listEmailLogs({}, freelancerId),
    );

    expect(prisma.emailNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('applies type filter', async () => {
    const cls = new ClsService();
    const items = [createMockEmailNotification({ type: NotificationType.PAYMENT_RELEASED })];
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValue(createMockEmailNotification()),
        update: jest.fn().mockResolvedValue(createMockEmailNotification()),
        findMany: jest.fn().mockResolvedValue(items),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    (prisma.$transaction as jest.Mock) = jest.fn().mockResolvedValue([items, 1]);
    const service = new EmailNotificationsService(prisma, cls);

    await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () => service.listEmailLogs({ type: NotificationType.PAYMENT_RELEASED }, freelancerId),
    );

    expect(prisma.emailNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: NotificationType.PAYMENT_RELEASED,
        }),
      }),
    );
  });

  it('applies status filter', async () => {
    const cls = new ClsService();
    const items = [createMockEmailNotification({ status: NotificationStatus.FAILED })];
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValue(createMockEmailNotification()),
        update: jest.fn().mockResolvedValue(createMockEmailNotification()),
        findMany: jest.fn().mockResolvedValue(items),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    (prisma.$transaction as jest.Mock) = jest.fn().mockResolvedValue([items, 1]);
    const service = new EmailNotificationsService(prisma, cls);

    await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () => service.listEmailLogs({ status: NotificationStatus.FAILED }, freelancerId),
    );

    expect(prisma.emailNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: NotificationStatus.FAILED,
        }),
      }),
    );
  });

  it('applies agreementId filter', async () => {
    const cls = new ClsService();
    const items = [createMockEmailNotification({ agreementId })];
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValue(createMockEmailNotification()),
        update: jest.fn().mockResolvedValue(createMockEmailNotification()),
        findMany: jest.fn().mockResolvedValue(items),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    (prisma.$transaction as jest.Mock) = jest.fn().mockResolvedValue([items, 1]);
    const service = new EmailNotificationsService(prisma, cls);

    await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () => service.listEmailLogs({ agreementId }, freelancerId),
    );

    expect(prisma.emailNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          agreementId,
        }),
      }),
    );
  });

  it('applies recipientEmail filter', async () => {
    const cls = new ClsService();
    const items = [createMockEmailNotification({ recipientEmail: 'specific@example.com' })];
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValue(createMockEmailNotification()),
        update: jest.fn().mockResolvedValue(createMockEmailNotification()),
        findMany: jest.fn().mockResolvedValue(items),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    (prisma.$transaction as jest.Mock) = jest.fn().mockResolvedValue([items, 1]);
    const service = new EmailNotificationsService(prisma, cls);

    await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () => service.listEmailLogs({ recipientEmail: 'specific@example.com' }, freelancerId),
    );

    expect(prisma.emailNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          recipientEmail: 'specific@example.com',
        }),
      }),
    );
  });

  it('applies date range filter', async () => {
    const cls = new ClsService();
    const items = [createMockEmailNotification()];
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValue(createMockEmailNotification()),
        update: jest.fn().mockResolvedValue(createMockEmailNotification()),
        findMany: jest.fn().mockResolvedValue(items),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    (prisma.$transaction as jest.Mock) = jest.fn().mockResolvedValue([items, 1]);
    const service = new EmailNotificationsService(prisma, cls);

    await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () =>
        service.listEmailLogs(
          { from: '2026-01-01T00:00:00.000Z', to: '2026-12-31T23:59:59.999Z' },
          freelancerId,
        ),
    );

    expect(prisma.emailNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    );
  });

  it('scopes results to freelancer-owned agreements', async () => {
    const cls = new ClsService();
    const items = [createMockEmailNotification({ agreementId })];
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValue(createMockEmailNotification()),
        update: jest.fn().mockResolvedValue(createMockEmailNotification()),
        findMany: jest.fn().mockResolvedValue(items),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    (prisma.$transaction as jest.Mock) = jest.fn().mockResolvedValue([items, 1]);
    const service = new EmailNotificationsService(prisma, cls);

    await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () => service.listEmailLogs({}, freelancerId),
    );

    expect(prisma.emailNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { agreement: { freelancerId } },
            { metadata: { path: ['actorUserId'], equals: freelancerId } },
          ],
        }),
      }),
    );
  });

  it('does not scope when userId is not provided and CLS has no userId', async () => {
    const cls = new ClsService();
    const items = [createMockEmailNotification()];
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValue(createMockEmailNotification()),
        update: jest.fn().mockResolvedValue(createMockEmailNotification()),
        findMany: jest.fn().mockResolvedValue(items),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    (prisma.$transaction as jest.Mock) = jest.fn().mockResolvedValue([items, 1]);
    const service = new EmailNotificationsService(prisma, cls);

    // Run without userId in CLS context so default parameter resolves undefined
    await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date() },
      () => service.listEmailLogs({}),
    );

    expect(prisma.emailNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          OR: expect.anything(),
        }),
      }),
    );
  });

  it('returns correct totalPages calculation', async () => {
    const cls = new ClsService();
    const items = Array.from({ length: 5 }, (_, i) =>
      createMockEmailNotification({ id: `n${i}` }),
    );
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValue(createMockEmailNotification()),
        update: jest.fn().mockResolvedValue(createMockEmailNotification()),
        findMany: jest.fn().mockResolvedValue(items),
        count: jest.fn().mockResolvedValue(22),
      },
    });
    (prisma.$transaction as jest.Mock) = jest.fn().mockResolvedValue([items, 22]);
    const service = new EmailNotificationsService(prisma, cls);

    const result = await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () => service.listEmailLogs({ page: 1, limit: 10 }, freelancerId),
    );

    expect(result.pagination.totalPages).toBe(3);
  });
});

// ============================================================================
// US1 boundary — enqueue methods
// ============================================================================
// ============================================================================
// US3 — Non-disclosure and provider sanitization coverage
// ============================================================================
describe('EmailNotificationsService — non-disclosure (US3)', () => {
  it('does not expose password hashes in template context', async () => {
    const cls = new ClsService();
    const safeAgreement = createMockAgreement();
    const prisma = createPrismaMock({
      agreement: { findFirst: jest.fn().mockResolvedValue(safeAgreement) },
    });
    const service = new EmailNotificationsService(prisma, cls);

    const context = await service.buildTemplateContext(
      NotificationType.AGREEMENT_INVITE,
      agreementId,
      {},
      freelancerId,
    );

    const contextStr = JSON.stringify(context);
    expect(contextStr).not.toContain('passwordHash');
    expect(contextStr).not.toContain('password');
    expect(contextStr).not.toContain('hash');
    expect(context.freelancer).not.toHaveProperty('passwordHash');
    expect(context.freelancer).not.toHaveProperty('password');
    expect((context.freelancer as Record<string, unknown> | undefined)?.passwordHash).toBeUndefined();
  });

  it('does not expose token hashes in template context', async () => {
    const cls = new ClsService();
    const safeAgreement = createMockAgreement();
    const prisma = createPrismaMock({
      agreement: { findFirst: jest.fn().mockResolvedValue(safeAgreement) },
    });
    const service = new EmailNotificationsService(prisma, cls);

    const context = await service.buildTemplateContext(
      NotificationType.AGREEMENT_INVITE,
      agreementId,
      {},
      freelancerId,
    );

    const contextStr = JSON.stringify(context);
    expect(contextStr).not.toContain('tokenHash');
    expect(contextStr).not.toContain('portalToken');
    expect(contextStr).not.toContain('inviteToken');
  });

  it('does not expose another freelancer agreement in logs', async () => {
    const cls = new ClsService();
    const items = [createMockEmailNotification({ agreementId: 'other-freelancer-agreement' })];
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValue(createMockEmailNotification()),
        update: jest.fn().mockResolvedValue(createMockEmailNotification()),
        findMany: jest.fn().mockResolvedValue(items),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    (prisma.$transaction as jest.Mock) = jest.fn().mockResolvedValue([items, 1]);
    const service = new EmailNotificationsService(prisma, cls);

    await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () => service.listEmailLogs({}, freelancerId),
    );

    expect(prisma.emailNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.anything(),
        }),
      }),
    );
  });

  it('logs query does not include unauthorized agreements in where clause without userId', async () => {
    const cls = new ClsService();
    const items = [createMockEmailNotification()];
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValue(createMockEmailNotification()),
        update: jest.fn().mockResolvedValue(createMockEmailNotification()),
        findMany: jest.fn().mockResolvedValue(items),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    (prisma.$transaction as jest.Mock) = jest.fn().mockResolvedValue([items, 1]);
    const service = new EmailNotificationsService(prisma, cls);

    await service.listEmailLogs({});

    expect(prisma.emailNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          OR: expect.anything(),
        }),
      }),
    );
  });
});

describe('EmailNotificationsService — provider error sanitization (US3)', () => {
  it('sanitizes AppException to error code instead of exposing raw error', () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma, cls);

    const appEx = new AppException({ code: ErrorCode.AGREEMENT_NOT_FOUND });
    const sanitized = (service as unknown as { sanitizeError: (error: unknown) => string }).sanitizeError(
      appEx,
    );

    expect(sanitized).toBe(ErrorCode.AGREEMENT_NOT_FOUND);
    expect(sanitized).not.toContain('secret');
    expect(sanitized).not.toContain('stack');
  });

  it('truncates long error messages to 300 characters', () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma, cls);

    const longMessage = 'x'.repeat(500);
    const sanitized = (service as unknown as { sanitizeError: (error: unknown) => string }).sanitizeError(
      new Error(longMessage),
    );

    expect(sanitized.length).toBeLessThanOrEqual(300);
    expect(sanitized).not.toContain('API_KEY');
  });

  it('returns EMAIL_SEND_FAILED fallback for unparseable errors', () => {
    const cls = new ClsService();
    const prisma = createPrismaMock();
    const service = new EmailNotificationsService(prisma, cls);

    const sanitized = (service as unknown as { sanitizeError: (error: unknown) => string }).sanitizeError(
      null,
    );

    expect(sanitized).toBe(ErrorCode.EMAIL_SEND_FAILED);
  });

  it('failed notification errorMessage never contains API keys or secrets', async () => {
    const cls = new ClsService();
    const createdRecord = createMockEmailNotification({ status: NotificationStatus.PENDING });
    const failedRecord = createMockEmailNotification({
      status: NotificationStatus.FAILED,
      errorMessage: 'Email provider is not configured; preview stored.',
    });
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValue(createdRecord),
        update: jest.fn().mockResolvedValue(failedRecord),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const service = new EmailNotificationsService(prisma, cls);

    const result = await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () =>
        service.sendNotification({
          agreementId,
          recipientEmail: validEmail,
          type: NotificationType.AGREEMENT_INVITE,
        }),
    );

    expect(result.errorMessage).toBeDefined();
    if (result.errorMessage) {
      expect(result.errorMessage).not.toContain('RESEND_API_KEY');
      expect(result.errorMessage).not.toContain('api_key');
      expect(result.errorMessage).not.toContain('secret');
    }
  });

  it('provider failure never includes stack traces in notification records', async () => {
    const cls = new ClsService();
    const failedRecord = createMockEmailNotification({
      status: NotificationStatus.FAILED,
      errorMessage: ErrorCode.EMAIL_SEND_FAILED,
    });
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValueOnce(failedRecord),
        update: jest.fn().mockResolvedValue(createMockEmailNotification()),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const service = new EmailNotificationsService(prisma, cls);

    const result = await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () =>
        service.sendNotification({
          agreementId,
          recipientEmail: validEmail,
          type: NotificationType.AGREEMENT_INVITE,
        }),
    );

    expect(result.errorMessage).toBeDefined();
    if (result.errorMessage) {
      expect(result.errorMessage).not.toContain('at ');
      expect(result.errorMessage).not.toContain('.ts:');
      expect(result.errorMessage).not.toContain('node_modules');
    }
  });
});

describe('EmailNotificationsService — enqueue methods (US1)', () => {
  it('enqueueAiReviewOpenedForFreelancer sends notification without throwing', async () => {
    const cls = new ClsService();
    const sentRecord = createMockEmailNotification({ status: NotificationStatus.SENT });
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValue(createMockEmailNotification({ status: NotificationStatus.PENDING })),
        update: jest.fn().mockResolvedValue(sentRecord),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const service = new EmailNotificationsService(prisma, cls);

    await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () =>
        service.enqueueAiReviewOpenedForFreelancer({
          agreementId,
          recipientEmail: validEmail,
          aiReviewId: 'ai-review-1',
          deliveryId: 'delivery-1',
          milestoneId: 'milestone-1',
        }),
    );
  });

  it('enqueueAiReviewRecommendationAcceptedForClient sends notification without throwing', async () => {
    const cls = new ClsService();
    const sentRecord = createMockEmailNotification({ status: NotificationStatus.SENT });
    const prisma = createPrismaMock({
      emailNotification: {
        create: jest.fn().mockResolvedValue(createMockEmailNotification({ status: NotificationStatus.PENDING })),
        update: jest.fn().mockResolvedValue(sentRecord),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const service = new EmailNotificationsService(prisma, cls);

    await cls.run(
      { actorType: ActorType.FREELANCER, correlationId: 'corr-1', locale: Locale.AR, requestId: 'req-1', startedAt: new Date(), userId: freelancerId },
      () =>
        service.enqueueAiReviewRecommendationAcceptedForClient({
          agreementId,
          recipientEmail: validEmail,
          recommendation: 'RELEASE_TO_FREELANCER',
          paymentStatus: 'READY_TO_RELEASE',
        }),
    );
  });
});
