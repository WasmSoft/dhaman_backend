import { Test, TestingModule } from '@nestjs/testing';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { ClientPortalService } from '../client-portal.service';
import {
  buildPrismaMock,
  buildPaymentsServiceMock,
  buildDeliveriesServiceMock,
  buildTimelineServiceMock,
  buildEmailServiceMock,
  buildClsServiceMock,
  makeMockAgreement,
  makeValidTokenFixture,
  makeUnknownTokenFixture,
  makeExpiredTokenFixture,
  makeRevokedTokenFixture,
} from './client-portal.service.test-utils';

describe('ClientPortalService — token security (US1)', () => {
  let service: ClientPortalService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;
  let clsMock: ReturnType<typeof buildClsServiceMock>;

  beforeEach(async () => {
    prismaMock = buildPrismaMock();
    const paymentsMock = buildPaymentsServiceMock();
    const deliveriesMock = buildDeliveriesServiceMock();
    const timelineMock = buildTimelineServiceMock();
    const emailMock = buildEmailServiceMock();
    clsMock = buildClsServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientPortalService,
        {
          provide: require('../../../infrastructure/prisma/prisma.service')
            .PrismaService,
          useValue: prismaMock,
        },
        {
          provide: require('../../../common/cls/cls.service').ClsService,
          useValue: clsMock,
        },
        {
          provide: require('../../payments/payments.service').PaymentsService,
          useValue: paymentsMock,
        },
        {
          provide: require('../../deliveries/deliveries.service')
            .DeliveriesService,
          useValue: deliveriesMock,
        },
        {
          provide: require('../../timeline-events/timeline-events.service')
            .TimelineEventsService,
          useValue: timelineMock,
        },
        {
          provide:
            require('../../email-notifications/email-notifications.service')
              .EmailNotificationsService,
          useValue: emailMock,
        },
      ],
    }).compile();

    service = module.get<ClientPortalService>(ClientPortalService);
  });

  // ──────────────────────────────────────────────────────────
  //  Token context validation — getPortalContext
  // ──────────────────────────────────────────────────────────

  describe('getPortalContext security', () => {
    it('should reject when CLS has no agreementId (malformed context)', async () => {
      clsMock.getContext.mockReturnValue({});

      await expect(service.getInvite('any-token')).rejects.toMatchObject({
        code: ErrorCode.PORTAL_TOKEN_INVALID,
      });
    });

    it('should reject when CLS has no portalTokenId (incomplete context)', async () => {
      clsMock.getContext.mockReturnValue({
        agreementId: 'agreement-1',
        // portalTokenId missing
      });

      await expect(service.getInvite('any-token')).rejects.toMatchObject({
        code: ErrorCode.PORTAL_TOKEN_INVALID,
      });
    });

    it('should reject when CLS context is null/undefined', async () => {
      clsMock.getContext.mockReturnValue(null);

      await expect(service.getInvite('any-token')).rejects.toMatchObject({
        code: ErrorCode.PORTAL_TOKEN_INVALID,
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  //  Token creation security
  // ──────────────────────────────────────────────────────────

  describe('createPortalToken security', () => {
    it('should store only tokenHash, never raw token', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(makeMockAgreement());
      prismaMock.portalToken.create.mockResolvedValue(
        makeValidTokenFixture(),
      );

      const result = await service.createPortalToken('agreement-1', 'AGREEMENT_INVITE');

      // Raw token must be 64 hex chars (32 bytes)
      expect(result.rawToken).toHaveLength(64);

      const createCall = prismaMock.portalToken.create.mock.calls[0][0];
      // Stored hash must NOT equal raw token
      expect(createCall.data.tokenHash).not.toBe(result.rawToken);
      // Preview must be first 8 chars of raw token
      expect(createCall.data.tokenPreview).toBe(result.rawToken.substring(0, 8));
      // Hash must be sha256 hex (64 chars)
      expect(createCall.data.tokenHash).toHaveLength(64);
    });

    it('should throw AGREEMENT_NOT_FOUND for non-existent agreement', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(null);

      await expect(
        service.createPortalToken('missing-agreement', 'AGREEMENT_INVITE'),
      ).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_FOUND,
      });
    });

    it('should throw PORTAL_TOKEN_CREATE_FAILED when persistence fails', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(makeMockAgreement());
      prismaMock.portalToken.create.mockRejectedValue(new Error('DB connection lost'));

      await expect(
        service.createPortalToken('agreement-1', 'AGREEMENT_INVITE'),
      ).rejects.toMatchObject({
        code: ErrorCode.PORTAL_TOKEN_CREATE_FAILED,
      });
    });

    it('should support expiry options', async () => {
      const futureDate = new Date('2027-01-01');
      prismaMock.agreement.findUnique.mockResolvedValue(makeMockAgreement());
      prismaMock.portalToken.create.mockResolvedValue(
        makeValidTokenFixture({ expiresAt: futureDate }),
      );

      const result = await service.createPortalToken('agreement-1', 'AGREEMENT_INVITE', {
        expiresAt: futureDate,
      });

      const createCall = prismaMock.portalToken.create.mock.calls[0][0];
      expect(createCall.data.expiresAt).toEqual(futureDate);
      expect(result.rawToken).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────
  //  Portal operations must require valid CLS context
  // ──────────────────────────────────────────────────────────

  const portalOperations = [
    { name: 'getInvite', call: () => service.getInvite('token') },
    { name: 'approve', call: () => service.approve('token') },
    {
      name: 'requestChanges',
      call: () =>
        service.requestChanges('token', {
          reason: 'The milestones need adjustment for the timeline.',
        }),
    },
    {
      name: 'rejectAgreement',
      call: () =>
        service.rejectAgreement('token', {
          reason: 'Budget mismatch.',
        }),
    },
    { name: 'getPortal', call: () => service.getPortal('token') },
    { name: 'getPayments', call: () => service.getPayments('token') },
    { name: 'getPaymentHistory', call: () => service.getPaymentHistory('token') },
    { name: 'getTimeline', call: () => service.getTimeline('token') },
  ];

  for (const op of portalOperations) {
    it(`${op.name} should throw PORTAL_TOKEN_INVALID when CLS context is missing`, async () => {
      clsMock.getContext.mockReturnValue({});

      await expect(op.call()).rejects.toMatchObject({
        code: ErrorCode.PORTAL_TOKEN_INVALID,
      });
    });
  }

  // ──────────────────────────────────────────────────────────
  //  Delegated operations also require CLS context
  // ──────────────────────────────────────────────────────────

  it('acceptDelivery should throw PORTAL_TOKEN_INVALID when context missing', async () => {
    clsMock.getContext.mockReturnValue({});

    await expect(
      service.acceptDelivery('token', 'd1'),
    ).rejects.toMatchObject({
      code: ErrorCode.PORTAL_TOKEN_INVALID,
    });
  });

  it('requestDeliveryChanges should throw PORTAL_TOKEN_INVALID when context missing', async () => {
    clsMock.getContext.mockReturnValue({});

    await expect(
      service.requestDeliveryChanges('token', 'd1', {
        reason: 'Needs revision.',
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.PORTAL_TOKEN_INVALID,
    });
  });

  it('fundPayment should throw PORTAL_TOKEN_INVALID when context missing', async () => {
    clsMock.getContext.mockReturnValue({});

    await expect(
      service.fundPayment('token', 'p1', { amount: '1000.00' }),
    ).rejects.toMatchObject({
      code: ErrorCode.PORTAL_TOKEN_INVALID,
    });
  });

  it('releasePayment should throw PORTAL_TOKEN_INVALID when context missing', async () => {
    clsMock.getContext.mockReturnValue({});

    await expect(
      service.releasePayment('token', 'p1', { confirmed: true }),
    ).rejects.toMatchObject({
      code: ErrorCode.PORTAL_TOKEN_INVALID,
    });
  });
});
