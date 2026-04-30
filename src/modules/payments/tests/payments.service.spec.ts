import {
  AgreementStatus,
  MilestoneStatus,
  PaymentStatus,
  TimelineActorRole,
  TimelineEventType,
} from '@prisma/client';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { AgreementsService } from '../../agreements/agreements.service';
import { TimelineEventsService } from '../../timeline-events/timeline-events.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { PaymentsService } from '../payments.service';

describe('PaymentsService release', () => {
  const paymentId = 'payment-001';
  const agreementId = 'agreement-001';
  const milestoneId = 'milestone-001';

  const prisma: any = { $transaction: jest.fn() };
  const agreementsService: any = {
    checkCompletionStatus: jest.fn().mockResolvedValue({
      agreementId,
      completed: true,
      status: AgreementStatus.COMPLETED,
      timelineEventCreated: true,
    }),
  };
  const timelineEventsService: any = {
    createEvent: jest.fn().mockResolvedValue({}),
  };

  function buildService() {
    return new PaymentsService(
      prisma as PrismaService,
      agreementsService as AgreementsService,
      timelineEventsService as TimelineEventsService,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('releases a ready payment and checks completion in the same transaction', async () => {
    const service = buildService();
    const tx: any = {
      payment: {
        findFirst: jest.fn().mockResolvedValue({
          id: paymentId,
          agreementId,
          milestoneId,
          status: PaymentStatus.READY_TO_RELEASE,
        }),
        update: jest
          .fn()
          .mockResolvedValue({ id: paymentId, status: PaymentStatus.RELEASED }),
      },
      milestone: { update: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const result = await service.release({ paymentId });

    expect(tx.milestone.update).toHaveBeenCalledWith({
      where: { id: milestoneId },
      data: {
        paymentStatus: PaymentStatus.RELEASED,
        status: MilestoneStatus.ACCEPTED,
      },
    });
    expect(timelineEventsService.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        agreementId,
        milestoneId,
        type: TimelineEventType.PAYMENT_RELEASED,
        actorRole: TimelineActorRole.FREELANCER,
      }),
      tx,
    );
    expect(agreementsService.checkCompletionStatus).toHaveBeenCalledWith(
      tx,
      agreementId,
    );
    expect(result).toEqual(
      expect.objectContaining({
        paymentId,
        status: PaymentStatus.RELEASED,
        completed: true,
      }),
    );
  });

  it('throws PAYMENT_NOT_FOUND for missing payments', async () => {
    const service = buildService();
    const tx: any = {
      payment: { findFirst: jest.fn().mockResolvedValue(null) },
      milestone: { update: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await expect(service.release({ paymentId } as any)).rejects.toMatchObject({
      code: ErrorCode.PAYMENT_NOT_FOUND,
    });
  });

  it('throws PAYMENT_ALREADY_RELEASED for released payments', async () => {
    const service = buildService();
    const tx: any = {
      payment: {
        findFirst: jest.fn().mockResolvedValue({
          id: paymentId,
          agreementId,
          milestoneId,
          status: PaymentStatus.RELEASED,
        }),
      },
      milestone: { update: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await expect(service.release({ paymentId } as any)).rejects.toMatchObject({
      code: ErrorCode.PAYMENT_ALREADY_RELEASED,
    });
  });

  it('throws PAYMENT_NOT_READY_TO_RELEASE for non-ready payments', async () => {
    const service = buildService();
    const tx: any = {
      payment: {
        findFirst: jest.fn().mockResolvedValue({
          id: paymentId,
          agreementId,
          milestoneId,
          status: PaymentStatus.RESERVED,
        }),
      },
      milestone: { update: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await expect(service.release({ paymentId } as any)).rejects.toMatchObject({
      code: ErrorCode.PAYMENT_NOT_READY_TO_RELEASE,
    });
  });
});
