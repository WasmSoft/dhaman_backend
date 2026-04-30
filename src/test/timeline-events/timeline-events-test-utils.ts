import {
  TimelineActorRole,
  TimelineEventType,
  type Prisma,
} from '@prisma/client';
import { ClsService } from '../../common/cls/cls.service';
import { ActorType } from '../../common/enums/actor-type.enum';
import { Locale } from '../../common/enums/locale.enum';
import type { RequestContext } from '../../common/cls/request-context.type';

// AR: مصنع سجل أحداث زمني يحاكي صف قاعدة بيانات للاختبارات.
// EN: Factory returning a timeline event row that mimics a database record for tests.
export function createTimelineEventRow(
  overrides: Partial<TimelineEventRow> = {},
): TimelineEventRow {
  return {
    actor: { name: 'Test Actor' },
    actorRole: TimelineActorRole.FREELANCER,
    agreementId: 'agreement-1',
    createdAt: new Date('2026-04-29T12:00:00.000Z'),
    description: 'Test event description.',
    id: 'event-1',
    metadata: {},
    milestoneId: null,
    title: 'Test event',
    type: TimelineEventType.AGREEMENT_CREATED,
    ...overrides,
  };
}

// AR: يصنع صفوف سجل أحداث متعددة بمعرفات وتواريخ مختلفة.
// EN: Creates multiple timeline event rows with distinct IDs and dates.
export function createTimelineEventRows(
  count: number,
  baseOverrides: Partial<TimelineEventRow> = {},
): TimelineEventRow[] {
  const baseDate = new Date('2026-04-29T12:00:00.000Z');
  return Array.from({ length: count }, (_, i) =>
    createTimelineEventRow({
      ...baseOverrides,
      id: `event-${i + 1}`,
      createdAt: new Date(baseDate.getTime() - i * 60 * 60 * 1000),
    }),
  );
}

// AR: ينشئ سياق طلب CLS كامل مع قيم افتراضية آمنة للاختبار.
// EN: Creates a complete CLS request context with safe default values for testing.
export function createClsContext(
  overrides: Partial<RequestContext> = {},
): RequestContext {
  return {
    actorType: ActorType.FREELANCER,
    correlationId: 'corr-test',
    locale: Locale.EN,
    requestId: 'req-test',
    startedAt: new Date('2026-04-29T00:00:00.000Z'),
    userId: 'user-test',
    ...overrides,
  };
}

// AR: ينفذ رد الاتصال داخل سياق CLS تم تكوينه مسبقاً.
// EN: Executes a callback inside a pre-configured CLS context.
export async function runInClsContext<T>(
  cls: ClsService,
  contextOverrides: Partial<RequestContext>,
  callback: () => T,
): Promise<T> {
  return cls.run(createClsContext(contextOverrides), callback);
}

// AR: كعب خدمة Prisma يعيد صفوف سجل أحداث وعدداً إجمالياً محدداً مسبقاً.
// EN: Prisma service stub that returns configured timeline event rows and total count.
export function createPrismaStub(
  mockEvents: TimelineEventRow[] = [],
  mockTotal: number = mockEvents.length,
) {
  return {
    $transaction: jest
      .fn()
      .mockImplementation(async (arg: unknown) =>
        Array.isArray(arg) ? Promise.all(arg) : [],
      ),
    timelineEvent: {
      create: jest.fn().mockResolvedValue({ id: 'event-1' }),
      count: jest.fn().mockResolvedValue(mockTotal),
      findMany: jest.fn().mockResolvedValue(mockEvents),
      update: jest.fn(),
      delete: jest.fn(),
    },
    agreement: {
      findFirst: jest.fn(),
    },
    portalToken: {
      findUnique: jest.fn(),
    },
  };
}

// AR: كعب رمز بوابة بتكوين قابل للتخصيص للاختبار.
// EN: Portal token stub factory with customizable configuration.
export function createPortalTokenStub(
  overrides: {
    agreementId?: string | null;
    expiresAt?: Date | null;
    revokedAt?: Date | null;
  } = {},
) {
  return {
    agreementId: overrides.agreementId ?? 'agreement-portal',
    expiresAt: overrides.expiresAt === undefined ? null : overrides.expiresAt,
    revokedAt: overrides.revokedAt === undefined ? null : overrides.revokedAt,
  };
}

// AR: كعب اتفاق للاختبار يعيد سجل اتفاق بسيط.
// EN: Agreement stub factory returning a simple agreement record.
export function createAgreementStub(overrides: { id?: string } = {}) {
  return { id: overrides.id ?? 'agreement-1' };
}

export type TimelineEventRow = {
  actor: { name: string } | null;
  actorRole: TimelineActorRole;
  agreementId: string;
  createdAt: Date;
  description: string;
  id: string;
  metadata: Prisma.JsonValue | null;
  milestoneId: string | null;
  title: string;
  type: TimelineEventType;
};
