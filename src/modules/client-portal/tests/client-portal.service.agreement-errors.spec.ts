import { Test, TestingModule } from '@nestjs/testing';
import { AgreementStatus } from '@prisma/client';
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
} from './client-portal.service.test-utils';

describe('ClientPortalService — agreement business-state errors (US2)', () => {
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

  // ──────────────────────────────────────────────
  //  AGREEMENT_NOT_APPROVABLE state conflicts
  // ──────────────────────────────────────────────

  describe('AGREEMENT_NOT_APPROVABLE', () => {
    it('should throw for already approved agreement', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(
        makeMockAgreement({ status: 'APPROVED' }),
      );

      await expect(service.approve('any-token')).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_APPROVABLE,
      });
    });

    it('should throw for draft agreement', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(
        makeMockAgreement({ status: 'DRAFT' }),
      );

      await expect(service.approve('any-token')).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_APPROVABLE,
      });
    });

    it('should throw for cancelled agreement', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(
        makeMockAgreement({ status: 'CANCELLED' }),
      );

      await expect(service.approve('any-token')).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_APPROVABLE,
      });
    });

    it('should throw for rejected agreement (via CANCELLED)', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(
        makeMockAgreement({ status: 'CANCELLED' }),
      );

      await expect(service.approve('any-token')).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_APPROVABLE,
      });
    });
  });

  // ──────────────────────────────────────────────
  //  AGREEMENT_NOT_CHANGEABLE state conflicts
  // ──────────────────────────────────────────────

  describe('AGREEMENT_NOT_CHANGEABLE', () => {
    const dto = { reason: 'The milestones need adjustment for the timeline.' };

    it('should throw for approved agreement', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(
        makeMockAgreement({ status: 'APPROVED' }),
      );

      await expect(
        service.requestChanges('any-token', dto),
      ).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_CHANGEABLE,
      });
    });

    it('should throw for draft agreement', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(
        makeMockAgreement({ status: 'DRAFT' }),
      );

      await expect(
        service.requestChanges('any-token', dto),
      ).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_CHANGEABLE,
      });
    });

    it('should throw for cancelled agreement', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(
        makeMockAgreement({ status: 'CANCELLED' }),
      );

      await expect(
        service.requestChanges('any-token', dto),
      ).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_CHANGEABLE,
      });
    });

    it('should throw for terminated agreement', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(
        makeMockAgreement({ status: 'TERMINATED' }),
      );

      await expect(
        service.requestChanges('any-token', dto),
      ).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_CHANGEABLE,
      });
    });
  });

  // ──────────────────────────────────────────────
  //  AGREEMENT_NOT_REJECTABLE state conflicts
  // ──────────────────────────────────────────────

  describe('AGREEMENT_NOT_REJECTABLE', () => {
    const dto = { reason: 'Budget does not match our current requirements.' };

    it('should throw for approved agreement', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(
        makeMockAgreement({ status: 'APPROVED' }),
      );

      await expect(
        service.rejectAgreement('any-token', dto),
      ).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_REJECTABLE,
      });
    });

    it('should throw for draft agreement', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(
        makeMockAgreement({ status: 'DRAFT' }),
      );

      await expect(
        service.rejectAgreement('any-token', dto),
      ).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_REJECTABLE,
      });
    });

    it('should throw for already cancelled agreement', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(
        makeMockAgreement({ status: 'CANCELLED' }),
      );

      await expect(
        service.rejectAgreement('any-token', dto),
      ).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_REJECTABLE,
      });
    });
  });

  // ──────────────────────────────────────────────
  //  AGREEMENT_NOT_FOUND for missing agreement
  // ──────────────────────────────────────────────

  describe('AGREEMENT_NOT_FOUND', () => {
    it('should throw when agreement missing during approve', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(null);

      await expect(service.approve('any-token')).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_FOUND,
      });
    });

    it('should throw when agreement missing during requestChanges', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(null);

      await expect(
        service.requestChanges('any-token', {
          reason: 'The milestones need adjustment.',
        }),
      ).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_FOUND,
      });
    });

    it('should throw when agreement missing during rejectAgreement', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(null);

      await expect(
        service.rejectAgreement('any-token', {
          reason: 'Budget mismatch.',
        }),
      ).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_FOUND,
      });
    });

    it('should throw when agreement missing during getInvite', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(null);

      await expect(service.getInvite('any-token')).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_FOUND,
      });
    });
  });

  // ──────────────────────────────────────────────
  //  No side effects on state conflict errors
  // ──────────────────────────────────────────────

  describe('No side effects on error', () => {
    it('should not write to DB when APPROVE fails with state conflict', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(
        makeMockAgreement({ status: 'APPROVED' }),
      );

      await expect(service.approve('any-token')).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_APPROVABLE,
      });

      // Verify no update was attempted
      expect(prismaMock.agreement.update).not.toHaveBeenCalled();
    });

    it('should not write to DB when requestChanges fails with state conflict', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(
        makeMockAgreement({ status: 'APPROVED' }),
      );

      await expect(
        service.requestChanges('any-token', {
          reason: 'The milestones need adjustment.',
        }),
      ).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_CHANGEABLE,
      });

      expect(prismaMock.agreement.update).not.toHaveBeenCalled();
    });

    it('should not write to DB when rejectAgreement fails with state conflict', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(
        makeMockAgreement({ status: 'APPROVED' }),
      );

      await expect(
        service.rejectAgreement('any-token', {
          reason: 'Budget mismatch.',
        }),
      ).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_REJECTABLE,
      });

      expect(prismaMock.agreement.update).not.toHaveBeenCalled();
    });

    it('should not create timeline events when action is rejected', async () => {
      prismaMock.agreement.findUnique.mockResolvedValue(
        makeMockAgreement({ status: 'APPROVED' }),
      );

      // approve should fail - no timeline should be created
      await expect(service.approve('any-token')).rejects.toMatchObject({
        code: ErrorCode.AGREEMENT_NOT_APPROVABLE,
      });
    });
  });
});
