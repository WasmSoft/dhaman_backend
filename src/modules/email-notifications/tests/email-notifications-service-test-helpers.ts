import {
  AgreementStatus,
  NotificationType,
  NotificationStatus,
  TimelineActorRole,
  TimelineEventType,
} from '@prisma/client';
import { ClsService } from '../../../common/cls/cls.service';
import { ActorType } from '../../../common/enums/actor-type.enum';
import { Locale } from '../../../common/enums/locale.enum';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

export const validUuid = '550e8400-e29b-41d4-a716-446655440000';
export const freelancerId = 'freelancer-1111-1111-1111-111111111111';
export const clientId = 'client-2222-2222-2222-222222222222';
export const agreementId = 'agreement-3333-3333-3333-333333333333';
export const validEmail = 'client@example.com';

const DEFAULT_CLS_CONTEXT = {
  actorType: ActorType.FREELANCER,
  correlationId: 'corr-test-1',
  locale: Locale.AR,
  requestId: 'req-test-1',
  startedAt: new Date('2026-04-30T00:00:00.000Z'),
  userId: freelancerId,
};

export function createClsService(
  overrides?: Record<string, unknown>,
): ClsService {
  const clsService = new ClsService();

  clsService.run(
    {
      ...DEFAULT_CLS_CONTEXT,
      ...overrides,
    },
    () => {
      // context is active
    },
  );

  return clsService;
}

export function createMockAgreement(
  overrides?: Partial<{
    id: string;
    title: string;
    description: string;
    serviceType: string;
    totalAmount: string;
    currency: string;
    status: AgreementStatus;
    clientName: string;
    clientEmail: string;
    clientCompanyName: string | null;
    freelancerName: string;
    freelancerEmail: string;
  }>,
): {
  id: string;
  title: string;
  description: string;
  serviceType: string;
  totalAmount: { toString(): string };
  currency: string;
  status: AgreementStatus;
  client: { name: string; email: string; companyName: string | null };
  freelancer: { name: string; email: string };
} {
  const defaults = {
    id: agreementId,
    title: 'Test Agreement',
    description: 'A test agreement',
    serviceType: 'Development',
    totalAmount: '5000.00',
    currency: 'SAR',
    status: AgreementStatus.DRAFT,
    clientName: 'Test Client',
    clientEmail: validEmail,
    clientCompanyName: 'Test Corp',
    freelancerName: 'Test Freelancer',
    freelancerEmail: 'freelancer@example.com',
    ...overrides,
  };

  return {
    id: defaults.id,
    title: defaults.title,
    description: defaults.description,
    serviceType: defaults.serviceType,
    totalAmount: { toString: () => defaults.totalAmount },
    currency: defaults.currency,
    status: defaults.status,
    client: {
      name: defaults.clientName,
      email: defaults.clientEmail,
      companyName: defaults.clientCompanyName,
    },
    freelancer: {
      name: defaults.freelancerName,
      email: defaults.freelancerEmail,
    },
  };
}

export function createMockEmailNotification(
  overrides?: Partial<{
    id: string;
    agreementId: string | null;
    recipientEmail: string;
    type: NotificationType;
    subject: string;
    status: NotificationStatus;
    providerMessageId: string | null;
    errorMessage: string | null;
    previewHtml: string | null;
    sentAt: Date | null;
    createdAt: Date;
  }>,
): {
  id: string;
  agreementId: string | null;
  recipientEmail: string;
  type: NotificationType;
  subject: string;
  status: NotificationStatus;
  providerMessageId: string | null;
  errorMessage: string | null;
  previewHtml: string | null;
  sentAt: Date | null;
  createdAt: Date;
} {
  return {
    id: 'notif-4444-4444-4444-444444444444',
    agreementId: agreementId,
    recipientEmail: validEmail,
    type: NotificationType.AGREEMENT_INVITE,
    subject: 'دعوة لمراجعة اتفاق ضمان',
    status: NotificationStatus.PENDING,
    providerMessageId: null,
    errorMessage: null,
    previewHtml:
      '<html lang="ar" dir="rtl"><body><h1>دعوة اتفاق جديدة</h1></body></html>',
    sentAt: null,
    createdAt: new Date('2026-04-30T00:00:00.000Z'),
    ...overrides,
  };
}

export function createPrismaMock(overrides?: {
  emailNotification?: Partial<{
    create: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  }>;
  agreement?: Partial<{
    findFirst: jest.Mock;
  }>;
  timelineEvent?: Partial<{
    create: jest.Mock;
  }>;
}): PrismaService {
  return {
    emailNotification: {
      create: jest.fn().mockResolvedValue(createMockEmailNotification()),
      update: jest.fn().mockResolvedValue(createMockEmailNotification()),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      ...overrides?.emailNotification,
    },
    agreement: {
      findFirst: jest.fn().mockResolvedValue(createMockAgreement()),
      ...overrides?.agreement,
    },
    timelineEvent: {
      create: jest.fn().mockResolvedValue({ id: 'timeline-1' }),
      ...overrides?.timelineEvent,
    },
    $transaction: jest.fn((operations: unknown[]) => {
      if (Array.isArray(operations)) {
        return Promise.all(operations);
      }
      return (operations as () => unknown)();
    }),
  } as unknown as PrismaService;
}

export function expectErrorCode(error: unknown, code: string): void {
  expect(error).toBeDefined();
  const err = error as { code?: string };
  expect(err.code).toBe(code);
}
