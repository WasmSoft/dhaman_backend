import { Test, TestingModule } from '@nestjs/testing';
import { ChangeRequestStatus } from '@prisma/client';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { ChangeRequestsService } from '../change-requests.service';
import {
  buildPrismaMock,
  buildPaymentsServiceMock,
  buildTimelineServiceMock,
  buildEmailServiceMock,
  buildClsServiceMock,
  makeMockChangeRequest,
} from './change-requests.service.test-utils';

describe('ChangeRequestsService — Status Transitions', () => {
  let service: ChangeRequestsService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;
  let paymentsMock: ReturnType<typeof buildPaymentsServiceMock>;
  let timelineMock: ReturnType<typeof buildTimelineServiceMock>;
  let emailMock: ReturnType<typeof buildEmailServiceMock>;
  let clsMock: ReturnType<typeof buildClsServiceMock>;

  beforeEach(async () => {
    prismaMock = buildPrismaMock();
    paymentsMock = buildPaymentsServiceMock();
    timelineMock = buildTimelineServiceMock();
    emailMock = buildEmailServiceMock();
    clsMock = buildClsServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangeRequestsService,
        {
          provide: require('../../../infrastructure/prisma/prisma.service')
            .PrismaService,
          useValue: prismaMock,
        },
        {
          provide: require('../../payments/payments.service').PaymentsService,
          useValue: paymentsMock,
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
        {
          provide: require('../../../common/cls/cls.service').ClsService,
          useValue: clsMock,
        },
      ],
    }).compile();

    service = module.get<ChangeRequestsService>(ChangeRequestsService);
  });

  const setupState = (status: ChangeRequestStatus) => {
    prismaMock.changeRequest.findUnique.mockResolvedValue(
      makeMockChangeRequest({ status }),
    );
  };

  describe('send() — invalid states', () => {
    it('cannot send APPROVED → CHANGE_REQUEST_NOT_SENDABLE', async () => {
      setupState(ChangeRequestStatus.APPROVED);
      await expect(service.send('cr-1', 'freelancer-1')).rejects.toMatchObject({
        code: ErrorCode.CHANGE_REQUEST_NOT_SENDABLE,
      });
    });

    it('cannot send DECLINED → CHANGE_REQUEST_NOT_SENDABLE', async () => {
      setupState(ChangeRequestStatus.DECLINED);
      await expect(service.send('cr-1', 'freelancer-1')).rejects.toMatchObject({
        code: ErrorCode.CHANGE_REQUEST_NOT_SENDABLE,
      });
    });

    it('cannot send FUNDED → CHANGE_REQUEST_NOT_SENDABLE', async () => {
      setupState(ChangeRequestStatus.FUNDED);
      await expect(service.send('cr-1', 'freelancer-1')).rejects.toMatchObject({
        code: ErrorCode.CHANGE_REQUEST_NOT_SENDABLE,
      });
    });
  });

  describe('approveFromPortal() — invalid states', () => {
    beforeEach(() => {
      clsMock.getContext.mockReturnValue({
        agreementId: 'agreement-1',
      });
    });

    it('cannot approve DRAFT → CHANGE_REQUEST_NOT_APPROVABLE', async () => {
      setupState(ChangeRequestStatus.DRAFT);
      await expect(service.approveFromPortal('cr-1')).rejects.toMatchObject({
        code: ErrorCode.CHANGE_REQUEST_NOT_APPROVABLE,
      });
    });

    it('cannot approve DECLINED → CHANGE_REQUEST_NOT_APPROVABLE', async () => {
      setupState(ChangeRequestStatus.DECLINED);
      await expect(service.approveFromPortal('cr-1')).rejects.toMatchObject({
        code: ErrorCode.CHANGE_REQUEST_NOT_APPROVABLE,
      });
    });

    it('cannot approve FUNDED → CHANGE_REQUEST_NOT_APPROVABLE', async () => {
      setupState(ChangeRequestStatus.FUNDED);
      await expect(service.approveFromPortal('cr-1')).rejects.toMatchObject({
        code: ErrorCode.CHANGE_REQUEST_NOT_APPROVABLE,
      });
    });
  });

  describe('declineFromPortal() — invalid states', () => {
    const declineDto = { reason: 'Not needed at this stage of the project.' };

    beforeEach(() => {
      clsMock.getContext.mockReturnValue({
        agreementId: 'agreement-1',
      });
    });

    it('cannot decline DRAFT → CHANGE_REQUEST_NOT_DECLINABLE', async () => {
      setupState(ChangeRequestStatus.DRAFT);
      await expect(
        service.declineFromPortal('cr-1', declineDto),
      ).rejects.toMatchObject({
        code: ErrorCode.CHANGE_REQUEST_NOT_DECLINABLE,
      });
    });

    it('cannot decline APPROVED → CHANGE_REQUEST_NOT_DECLINABLE', async () => {
      setupState(ChangeRequestStatus.APPROVED);
      await expect(
        service.declineFromPortal('cr-1', declineDto),
      ).rejects.toMatchObject({
        code: ErrorCode.CHANGE_REQUEST_NOT_DECLINABLE,
      });
    });

    it('cannot decline FUNDED → CHANGE_REQUEST_NOT_DECLINABLE', async () => {
      setupState(ChangeRequestStatus.FUNDED);
      await expect(
        service.declineFromPortal('cr-1', declineDto),
      ).rejects.toMatchObject({
        code: ErrorCode.CHANGE_REQUEST_NOT_DECLINABLE,
      });
    });
  });

  describe('fundFromPortal() — invalid states', () => {
    const fundDto = {
      amount: '500.00',
      paymentMethodLabel: 'Demo Bank Transfer',
    };

    beforeEach(() => {
      clsMock.getContext.mockReturnValue({
        agreementId: 'agreement-1',
      });
    });

    it('cannot fund DRAFT → CHANGE_REQUEST_NOT_APPROVED', async () => {
      prismaMock.changeRequest.findUnique.mockResolvedValue(
        makeMockChangeRequest({
          status: ChangeRequestStatus.DRAFT,
          payments: [],
        }),
      );
      await expect(
        service.fundFromPortal('cr-1', fundDto),
      ).rejects.toMatchObject({ code: ErrorCode.CHANGE_REQUEST_NOT_APPROVED });
    });

    it('cannot fund SENT → CHANGE_REQUEST_NOT_APPROVED', async () => {
      prismaMock.changeRequest.findUnique.mockResolvedValue(
        makeMockChangeRequest({
          status: ChangeRequestStatus.SENT,
          payments: [],
        }),
      );
      await expect(
        service.fundFromPortal('cr-1', fundDto),
      ).rejects.toMatchObject({ code: ErrorCode.CHANGE_REQUEST_NOT_APPROVED });
    });

    it('cannot fund DECLINED → CHANGE_REQUEST_NOT_APPROVED', async () => {
      prismaMock.changeRequest.findUnique.mockResolvedValue(
        makeMockChangeRequest({
          status: ChangeRequestStatus.DECLINED,
          payments: [],
        }),
      );
      await expect(
        service.fundFromPortal('cr-1', fundDto),
      ).rejects.toMatchObject({ code: ErrorCode.CHANGE_REQUEST_NOT_APPROVED });
    });
  });

  describe('update() — invalid states', () => {
    const updateDto = { title: 'Updated title for change request' };

    it('cannot edit SENT → CHANGE_REQUEST_NOT_EDITABLE', async () => {
      setupState(ChangeRequestStatus.SENT);
      await expect(
        service.update('cr-1', updateDto, 'freelancer-1'),
      ).rejects.toMatchObject({ code: ErrorCode.CHANGE_REQUEST_NOT_EDITABLE });
    });

    it('cannot edit APPROVED → CHANGE_REQUEST_NOT_EDITABLE', async () => {
      setupState(ChangeRequestStatus.APPROVED);
      await expect(
        service.update('cr-1', updateDto, 'freelancer-1'),
      ).rejects.toMatchObject({ code: ErrorCode.CHANGE_REQUEST_NOT_EDITABLE });
    });

    it('cannot edit DECLINED → CHANGE_REQUEST_NOT_EDITABLE', async () => {
      setupState(ChangeRequestStatus.DECLINED);
      await expect(
        service.update('cr-1', updateDto, 'freelancer-1'),
      ).rejects.toMatchObject({ code: ErrorCode.CHANGE_REQUEST_NOT_EDITABLE });
    });

    it('cannot edit FUNDED → CHANGE_REQUEST_NOT_EDITABLE', async () => {
      setupState(ChangeRequestStatus.FUNDED);
      await expect(
        service.update('cr-1', updateDto, 'freelancer-1'),
      ).rejects.toMatchObject({ code: ErrorCode.CHANGE_REQUEST_NOT_EDITABLE });
    });
  });
});
