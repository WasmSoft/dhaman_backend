import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsService } from '../../../common/cls/cls.service';
import { DeliveriesController } from '../deliveries.controller';
import { DeliveriesService } from '../deliveries.service';

describe('DeliveriesController', () => {
  let controller: DeliveriesController;
  let serviceMock: Partial<Record<keyof DeliveriesService, jest.Mock>>;

  beforeEach(async () => {
    serviceMock = {
      createDelivery: jest.fn().mockReturnValue({ id: 'delivery-1' }),
      listDeliveries: jest.fn().mockReturnValue({ deliveries: [], total: 0 }),
      getDeliveryById: jest.fn().mockReturnValue({ id: 'delivery-1' }),
      updateDelivery: jest.fn().mockReturnValue({ id: 'delivery-1' }),
      submitDelivery: jest.fn().mockReturnValue({ id: 'delivery-1' }),
      acceptDeliveryFromPortal: jest.fn().mockReturnValue({ id: 'delivery-1' }),
      requestChangesFromPortal: jest.fn().mockReturnValue({ id: 'delivery-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveriesController],
      providers: [
        { provide: DeliveriesService, useValue: serviceMock },
        { provide: ClsService, useValue: { get: jest.fn(), getContext: jest.fn(), setContext: jest.fn() } },
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
        { provide: require('../../../infrastructure/prisma/prisma.service').PrismaService, useValue: { portalToken: { findUnique: jest.fn() } } },
      ],
    }).compile();

    controller = module.get<DeliveriesController>(DeliveriesController);
  });

  describe('freelancer routes', () => {
    it('create should delegate to createDelivery', () => {
      (controller as any).create('milestone-1', { summary: 'Test.' });
      expect(serviceMock.createDelivery).toHaveBeenCalledWith('milestone-1', {
        summary: 'Test.',
      });
    });

    it('list should delegate to listDeliveries', () => {
      (controller as any).list({ page: 1 });
      expect(serviceMock.listDeliveries).toHaveBeenCalledWith({ page: 1 });
    });

    it('getById should delegate to getDeliveryById', () => {
      (controller as any).getById('delivery-1');
      expect(serviceMock.getDeliveryById).toHaveBeenCalledWith('delivery-1');
    });

    it('update should delegate to updateDelivery', () => {
      (controller as any).update('delivery-1', { summary: 'Updated.' });
      expect(serviceMock.updateDelivery).toHaveBeenCalledWith('delivery-1', {
        summary: 'Updated.',
      });
    });

    it('submit should delegate to submitDelivery', () => {
      (controller as any).submit('delivery-1', {});
      expect(serviceMock.submitDelivery).toHaveBeenCalledWith('delivery-1', {});
    });
  });

  describe('portal routes', () => {
    it('acceptFromPortal should delegate to acceptDeliveryFromPortal', () => {
      (controller as any).acceptFromPortal('token-1', 'delivery-1');
      expect(serviceMock.acceptDeliveryFromPortal).toHaveBeenCalledWith(
        'token-1',
        'delivery-1',
        undefined,
      );
    });

    it('requestChangesFromPortal should delegate to requestChangesFromPortal', () => {
      (controller as any).requestChangesFromPortal('token-1', 'delivery-1', {
        reason: 'Please adjust alignment.',
      });
      expect(serviceMock.requestChangesFromPortal).toHaveBeenCalledWith(
        'token-1',
        'delivery-1',
        { reason: 'Please adjust alignment.' },
      );
    });
  });
});
