import {
  AgreementStatus,
  DeliveryStatus,
  MilestoneStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/errors/app-exception';

export const TEST_USER_ID = 'user-1';
export const TEST_AGREEMENT_ID = '11111111-1111-4111-8111-111111111111';
export const TEST_MILESTONE_ID = '22222222-2222-4222-8222-222222222222';
export const TEST_MILESTONE_ID_2 = '33333333-3333-4333-8333-333333333333';
export const TEST_MILESTONE_ID_3 = '44444444-4444-4444-8444-444444444444';
export const TEST_REQUEST_ID = 'req-test-1';
export const TEST_CORRELATION_ID = 'corr-test-1';
export const TEST_CREATED_AT = new Date('2026-04-29T00:00:00.000Z');
export const TEST_DUE_DATE = new Date('2026-05-15T00:00:00.000Z');

export function makeAgreement(
  overrides: Partial<{
    currency: string;
    freelancerId: string;
    id: string;
    status: AgreementStatus;
    totalAmount: Prisma.Decimal;
  }> = {},
) {
  return {
    currency: 'SAR',
    freelancerId: TEST_USER_ID,
    id: TEST_AGREEMENT_ID,
    status: AgreementStatus.DRAFT,
    totalAmount: new Prisma.Decimal('7500.00'),
    ...overrides,
  };
}

export function makeMilestone(
  overrides: Partial<{
    acceptanceCriteria: Array<{ description: string; required: boolean }>;
    agreement: ReturnType<typeof makeAgreement>;
    agreementId: string;
    amount: Prisma.Decimal;
    createdAt: Date;
    currency: string;
    deliveryStatus: DeliveryStatus;
    description: string | null;
    dueDate: Date | null;
    id: string;
    order: number;
    paymentStatus: PaymentStatus;
    revisionLimit: number;
    status: MilestoneStatus;
    title: string;
    updatedAt: Date;
  }> = {},
) {
  return {
    acceptanceCriteria: [
      { description: 'Logo delivered in SVG format', required: true },
    ],
    agreement: makeAgreement(),
    agreementId: TEST_AGREEMENT_ID,
    amount: new Prisma.Decimal('2500.00'),
    createdAt: TEST_CREATED_AT,
    currency: 'SAR',
    deliveryStatus: DeliveryStatus.NOT_SUBMITTED,
    description: 'Initial logo and brand files',
    dueDate: TEST_DUE_DATE,
    id: TEST_MILESTONE_ID,
    order: 1,
    paymentStatus: PaymentStatus.WAITING,
    revisionLimit: 3,
    status: MilestoneStatus.DRAFT,
    title: 'Brand identity delivery',
    updatedAt: TEST_CREATED_AT,
    ...overrides,
  };
}

export function makeMilestoneResponse(
  overrides: Partial<{
    acceptanceCriteria: Array<{ description: string; required: boolean }>;
    agreementId: string;
    amount: string;
    createdAt: string;
    currency: string;
    deliveryStatus: DeliveryStatus;
    description: string | null;
    dueDate: string | null;
    id: string;
    orderIndex: number;
    paymentStatus: PaymentStatus;
    revisionLimit: number;
    status: MilestoneStatus;
    title: string;
    updatedAt: string;
  }> = {},
) {
  return {
    acceptanceCriteria: [
      { description: 'Logo delivered in SVG format', required: true },
    ],
    agreementId: TEST_AGREEMENT_ID,
    amount: '2500.00',
    createdAt: TEST_CREATED_AT.toISOString(),
    currency: 'SAR',
    deliveryStatus: DeliveryStatus.NOT_SUBMITTED,
    description: 'Initial logo and brand files',
    dueDate: TEST_DUE_DATE.toISOString(),
    id: TEST_MILESTONE_ID,
    orderIndex: 1,
    paymentStatus: PaymentStatus.WAITING,
    revisionLimit: 3,
    status: MilestoneStatus.DRAFT,
    title: 'Brand identity delivery',
    updatedAt: TEST_CREATED_AT.toISOString(),
    ...overrides,
  };
}

export function makeCreateMilestoneDto(
  overrides: Partial<{
    acceptanceCriteria: Array<{ description: string; required?: boolean }>;
    amount: string;
    description?: string;
    dueDate?: string;
    orderIndex: number;
    revisionLimit?: number;
    title: string;
  }> = {},
) {
  return {
    acceptanceCriteria: [{ description: 'Logo delivered in SVG format' }],
    amount: '2500.00',
    description: 'Initial logo and brand files',
    dueDate: TEST_DUE_DATE.toISOString(),
    orderIndex: 1,
    title: 'Brand identity delivery',
    ...overrides,
  };
}

export function makeUpdateMilestoneDto(
  overrides: Partial<{
    acceptanceCriteria: Array<{ description: string; required?: boolean }>;
    amount?: string;
    description?: string;
    dueDate?: string;
    revisionLimit?: number;
    title?: string;
  }> = {},
) {
  return {
    acceptanceCriteria: [{ description: 'Updated criterion' }],
    amount: '2750.00',
    description: 'Updated description',
    dueDate: TEST_DUE_DATE.toISOString(),
    revisionLimit: 2,
    title: 'Updated title',
    ...overrides,
  };
}

export function makeReorderMilestonesDto(
  overrides: Partial<{
    milestones: Array<{ milestoneId: string; orderIndex: number }>;
  }> = {},
) {
  return {
    milestones: [
      { milestoneId: TEST_MILESTONE_ID_2, orderIndex: 1 },
      { milestoneId: TEST_MILESTONE_ID_3, orderIndex: 2 },
      { milestoneId: TEST_MILESTONE_ID, orderIndex: 3 },
    ],
    ...overrides,
  };
}

export function makePrismaMock() {
  const tx = {
    agreement: { findFirst: jest.fn() },
    milestone: {
      aggregate: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    timelineEvent: {
      create: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    ),
    agreement: tx.agreement,
    milestone: tx.milestone,
    timelineEvent: tx.timelineEvent,
  };

  return { prisma, tx };
}

export function makePaymentsServiceMock() {
  return {
    createPaymentForMilestone: jest.fn(),
    deleteWaitingPaymentForMilestone: jest.fn(),
    syncMilestonePaymentAmount: jest.fn(),
  };
}

export function makeTimelineEventsServiceMock() {
  return {
    createEvent: jest.fn(),
  };
}

export async function expectAppExceptionCode(
  promise: Promise<unknown>,
  code: ErrorCode,
): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code });
}

export function makeAppException(code: ErrorCode): AppException {
  return new AppException({ code });
}
