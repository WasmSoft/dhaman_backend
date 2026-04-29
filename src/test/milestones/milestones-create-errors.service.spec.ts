import { AgreementStatus, Prisma } from '@prisma/client';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { PaymentsService } from '../../modules/payments/payments.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MilestonesService } from '../../modules/milestones/milestones.service';
import { TimelineEventsService } from '../../modules/timeline-events/timeline-events.service';

type PrismaServiceMock = {
  $transaction: jest.Mock;
  agreement: { findFirst: jest.Mock };
  milestone: {
    aggregate: jest.Mock;
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
  };
};

function createAgreement(status = AgreementStatus.DRAFT) {
  return {
    currency: 'SAR',
    freelancerId: 'user-1',
    id: 'agreement-1',
    status,
    totalAmount: new Prisma.Decimal('7500.00'),
  };
}

async function expectAppException(
  promise: Promise<unknown>,
  code: ErrorCode,
): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code });
}

describe('MilestonesService createMilestone errors', () => {
  let service: MilestonesService;
  let prisma: PrismaServiceMock;
  let tx: {
    agreement: { findFirst: jest.Mock };
    milestone: PrismaServiceMock['milestone'];
  };

  beforeEach(() => {
    tx = {
      agreement: { findFirst: jest.fn() },
      milestone: {
        aggregate: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };
    prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
      agreement: tx.agreement,
      milestone: tx.milestone,
    };

    service = new MilestonesService(
      prisma as unknown as PrismaService,
      {
        createPaymentForMilestone: jest.fn(),
        deleteWaitingPaymentForMilestone: jest.fn(),
        syncMilestonePaymentAmount: jest.fn(),
      } as unknown as PaymentsService,
      {
        createEvent: jest.fn(),
      } as unknown as TimelineEventsService,
    );
  });

  const dto = {
    acceptanceCriteria: [{ description: 'Logo delivered in SVG format' }],
    amount: '2500.00',
    orderIndex: 1,
    title: 'Brand identity delivery',
  };

  it('throws AGREEMENT_NOT_FOUND for wrong owner or missing agreement', async () => {
    tx.agreement.findFirst.mockResolvedValue(null);

    await expectAppException(
      service.createMilestone('agreement-1', dto, 'user-1'),
      ErrorCode.AGREEMENT_NOT_FOUND,
    );
  });

  it('throws AGREEMENT_CANNOT_BE_MODIFIED for non-draft agreements', async () => {
    tx.agreement.findFirst.mockResolvedValue(
      createAgreement(AgreementStatus.ACTIVE),
    );

    await expectAppException(
      service.createMilestone('agreement-1', dto, 'user-1'),
      ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED,
    );
  });

  it('throws MILESTONE_INVALID_ORDER for duplicate orderIndex', async () => {
    tx.agreement.findFirst.mockResolvedValue(createAgreement());
    tx.milestone.findFirst.mockResolvedValue({ id: 'existing-milestone' });

    await expectAppException(
      service.createMilestone('agreement-1', dto, 'user-1'),
      ErrorCode.MILESTONE_INVALID_ORDER,
    );
  });

  it('throws MILESTONE_INVALID_AMOUNT for invalid decimals', async () => {
    await expectAppException(
      service.createMilestone(
        'agreement-1',
        { ...dto, amount: '0.00' },
        'user-1',
      ),
      ErrorCode.MILESTONE_INVALID_AMOUNT,
    );
  });

  it('throws MILESTONE_INVALID_AMOUNT for negative amounts', async () => {
    await expectAppException(
      service.createMilestone(
        'agreement-1',
        { ...dto, amount: '-10.00' },
        'user-1',
      ),
      ErrorCode.MILESTONE_INVALID_AMOUNT,
    );
  });
});
