import { NotificationStatus, NotificationType } from '@prisma/client';
import { ClsService } from '../../common/cls/cls.service';
import { Locale } from '../../common/enums/locale.enum';
import { ActorType } from '../../common/enums/actor-type.enum';
import { EmailNotificationsService } from '../../modules/email-notifications/email-notifications.service';

const NOW = new Date('2026-04-30T00:00:00.000Z');
const FREELANCER_ID = 'freelancer-1111-1111-1111-111111111111';
const AGREEMENT_ID = 'agreement-3333-3333-3333-333333333333';

function createMock() {
  return {
    agreement: { findFirst: jest.fn().mockResolvedValue(null) },
    emailNotification: {
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((ops: unknown[]) => {
      if (Array.isArray(ops)) return Promise.all(ops);
      return (ops as () => unknown)();
    }),
  };
}

describe('Email notifications — payment boundary', () => {
  it.skip('PAYMENT_RESERVED trigger is not yet implemented by Payments module', () => {});
  it.skip('PAYMENT_RELEASED trigger is not yet implemented by Payments module', () => {});
});
