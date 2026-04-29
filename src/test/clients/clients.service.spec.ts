import { ErrorCode } from '../../common/enums/error-code.enum';
import { ClsService } from '../../common/cls/cls.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ClientsService } from '../../modules/clients/clients.service';

function decimal(value: string | number) {
  return {
    toNumber: () => (typeof value === 'string' ? parseFloat(value) : value),
  };
}

type MockPrisma = {
  client: {
    findFirst: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
  };
  agreement: {
    findMany: jest.Mock;
  };
};

describe('ClientsService', () => {
  let service: ClientsService;
  let clsService: jest.Mocked<Pick<ClsService, 'get'>>;
  let prismaService: MockPrisma;

  beforeEach(() => {
    clsService = {
      get: jest.fn(),
    };

    prismaService = {
      client: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      agreement: {
        findMany: jest.fn(),
      },
    };

    service = new ClientsService(
      prismaService as unknown as PrismaService,
      clsService as ClsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOneOrCreateByEmail', () => {
    it('throws UNAUTHORIZED when no userId is present in CLS', async () => {
      clsService.get.mockReturnValue(undefined);

      await expect(
        service.findOneOrCreateByEmail({
          email: 'client@example.sa',
          name: 'Client Name',
        }),
      ).rejects.toMatchObject({
        code: ErrorCode.UNAUTHORIZED,
      });
    });

    it('returns existing client when normalized email already exists for the freelancer', async () => {
      clsService.get.mockReturnValue('freelancer-1');
      const existingClient = {
        id: 'client-1',
        freelancerId: 'freelancer-1',
        name: 'Existing Client',
        email: 'client@example.sa',
        phone: '+966501234567',
        companyName: 'Existing Co',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      prismaService.client.findFirst.mockResolvedValue(existingClient);

      const result = await service.findOneOrCreateByEmail({
        email: 'CLIENT@EXAMPLE.SA',
        name: 'Different Name',
        phone: '+966509876543',
        companyName: 'Different Co',
      });

      expect(prismaService.client.findFirst).toHaveBeenCalledWith({
        where: {
          freelancerId: 'freelancer-1',
          email: 'client@example.sa',
        },
      });
      expect(prismaService.client.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 'client-1',
        name: 'Existing Client',
        email: 'client@example.sa',
        phone: '+966501234567',
        companyName: 'Existing Co',
        createdAt: existingClient.createdAt,
        updatedAt: existingClient.updatedAt,
      });
    });

    it('does not overwrite existing client details on reuse', async () => {
      clsService.get.mockReturnValue('freelancer-1');
      const existingClient = {
        id: 'client-1',
        freelancerId: 'freelancer-1',
        name: 'Original Name',
        email: 'client@example.sa',
        phone: null,
        companyName: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      prismaService.client.findFirst.mockResolvedValue(existingClient);

      const result = await service.findOneOrCreateByEmail({
        email: ' client@example.sa ',
        name: 'New Name',
        phone: '+966501234567',
        companyName: 'New Co',
      });

      expect(result.name).toBe('Original Name');
      expect(result.phone).toBeNull();
      expect(result.companyName).toBeNull();
    });

    it('creates a new client when no existing client matches the normalized email', async () => {
      clsService.get.mockReturnValue('freelancer-1');
      prismaService.client.findFirst.mockResolvedValue(null);
      const createdClient = {
        id: 'client-new',
        freelancerId: 'freelancer-1',
        name: 'New Client',
        email: 'new@example.sa',
        phone: '+966501234567',
        companyName: 'New Co',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      prismaService.client.create.mockResolvedValue(createdClient);

      const result = await service.findOneOrCreateByEmail({
        email: 'NEW@EXAMPLE.SA',
        name: 'New Client',
        phone: '+966501234567',
        companyName: 'New Co',
      });

      expect(prismaService.client.create).toHaveBeenCalledWith({
        data: {
          freelancerId: 'freelancer-1',
          name: 'New Client',
          email: 'new@example.sa',
          phone: '+966501234567',
          companyName: 'New Co',
        },
      });
      expect(result.id).toBe('client-new');
    });

    it('retries findFirst on P2002 race condition and returns existing client', async () => {
      clsService.get.mockReturnValue('freelancer-1');
      prismaService.client.findFirst.mockResolvedValue(null);
      const prismaError = new Error('Unique constraint failed') as Error & {
        code: string;
      };
      prismaError.code = 'P2002';
      prismaService.client.create.mockRejectedValue(prismaError);
      const existingClient = {
        id: 'client-race',
        freelancerId: 'freelancer-1',
        name: 'Race Client',
        email: 'race@example.sa',
        phone: null,
        companyName: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      // Second findFirst after P2002 returns the existing client
      prismaService.client.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingClient);

      const result = await service.findOneOrCreateByEmail({
        email: 'race@example.sa',
        name: 'Race Client',
      });

      expect(prismaService.client.findFirst).toHaveBeenCalledTimes(2);
      expect(prismaService.client.create).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('client-race');
    });

    it('scopes email uniqueness to each freelancer independently', async () => {
      clsService.get.mockReturnValue('freelancer-a');
      const freelancerAClient = {
        id: 'client-a',
        freelancerId: 'freelancer-a',
        name: 'Shared Email Client A',
        email: 'shared@example.sa',
        phone: null,
        companyName: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      prismaService.client.findFirst.mockResolvedValue(freelancerAClient);

      const result = await service.findOneOrCreateByEmail({
        email: 'shared@example.sa',
        name: 'Any Name',
      });

      expect(prismaService.client.findFirst).toHaveBeenCalledWith({
        where: {
          freelancerId: 'freelancer-a',
          email: 'shared@example.sa',
        },
      });
      expect(result.id).toBe('client-a');
    });
  });

  describe('getSummary', () => {
    it('throws UNAUTHORIZED when no userId is present in CLS', async () => {
      clsService.get.mockReturnValue(undefined);

      await expect(service.getSummary('client-id-1')).rejects.toMatchObject({
        code: ErrorCode.UNAUTHORIZED,
      });
    });

    it('throws CLIENT_NOT_FOUND when client does not exist', async () => {
      clsService.get.mockReturnValue('freelancer-1');
      prismaService.client.findFirst.mockResolvedValue(null);

      await expect(service.getSummary('missing-client')).rejects.toMatchObject({
        code: ErrorCode.CLIENT_NOT_FOUND,
      });
    });

    it('throws CLIENT_NOT_FOUND for a client owned by another freelancer', async () => {
      clsService.get.mockReturnValue('freelancer-a');
      prismaService.client.findFirst.mockResolvedValue(null);

      await expect(
        service.getSummary('foreign-client-id'),
      ).rejects.toMatchObject({
        code: ErrorCode.CLIENT_NOT_FOUND,
      });
    });

    it('returns zero-value summary for a client with no agreements', async () => {
      clsService.get.mockReturnValue('freelancer-1');
      const client = {
        id: 'client-1',
        freelancerId: 'freelancer-1',
        name: 'Client Name',
        email: 'client@example.sa',
        phone: null,
        companyName: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      prismaService.client.findFirst.mockResolvedValue(client);
      prismaService.agreement.findMany.mockResolvedValue([]);

      const result = await service.getSummary('client-1');

      expect(result.client.id).toBe('client-1');
      expect(result.agreements.total).toBe(0);
      expect(result.agreements.byStatus).toEqual({
        DRAFT: 0,
        SENT: 0,
        APPROVED: 0,
        ACTIVE: 0,
        COMPLETED: 0,
        CANCELLED: 0,
        DISPUTED: 0,
      });
      expect(result.payments.totalAmount).toBe(0);
      expect(result.payments.releasedAmount).toBe(0);
      expect(result.payments.pendingAmount).toBe(0);
      expect(result.payments.currency).toBeNull();
      expect(result.recentAgreements).toEqual([]);
    });

    it('counts agreements by status and includes all seven statuses', async () => {
      clsService.get.mockReturnValue('freelancer-1');
      const client = {
        id: 'client-1',
        freelancerId: 'freelancer-1',
        name: 'Client Name',
        email: 'client@example.sa',
        phone: null,
        companyName: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      prismaService.client.findFirst.mockResolvedValue(client);
      prismaService.agreement.findMany.mockResolvedValue([
        {
          id: 'a1',
          status: 'DRAFT',
          title: 'A1',
          totalAmount: decimal(0),
          currency: 'SAR',
          createdAt: new Date('2026-01-03'),
          milestones: [],
        },
        {
          id: 'a2',
          status: 'ACTIVE',
          title: 'A2',
          totalAmount: decimal(0),
          currency: 'SAR',
          createdAt: new Date('2026-01-02'),
          milestones: [],
        },
        {
          id: 'a3',
          status: 'ACTIVE',
          title: 'A3',
          totalAmount: decimal(0),
          currency: 'SAR',
          createdAt: new Date('2026-01-01'),
          milestones: [],
        },
      ]);

      const result = await service.getSummary('client-1');

      expect(result.agreements.total).toBe(3);
      expect(result.agreements.byStatus.DRAFT).toBe(1);
      expect(result.agreements.byStatus.ACTIVE).toBe(2);
      expect(result.agreements.byStatus.SENT).toBe(0);
      expect(result.agreements.byStatus.APPROVED).toBe(0);
      expect(result.agreements.byStatus.COMPLETED).toBe(0);
      expect(result.agreements.byStatus.CANCELLED).toBe(0);
      expect(result.agreements.byStatus.DISPUTED).toBe(0);
    });

    it('calculates payment totals from milestone amounts', async () => {
      clsService.get.mockReturnValue('freelancer-1');
      const client = {
        id: 'client-1',
        freelancerId: 'freelancer-1',
        name: 'Client Name',
        email: 'client@example.sa',
        phone: null,
        companyName: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      prismaService.client.findFirst.mockResolvedValue(client);
      prismaService.agreement.findMany.mockResolvedValue([
        {
          id: 'a1',
          status: 'ACTIVE',
          title: 'Agreement 1',
          totalAmount: decimal('10000'),
          currency: 'SAR',
          createdAt: new Date('2026-01-01'),
          milestones: [
            {
              amount: decimal('5000'),
              currency: 'SAR',
              paymentStatus: 'RELEASED',
            },
            {
              amount: decimal('3000'),
              currency: 'SAR',
              paymentStatus: 'PENDING',
            },
            {
              amount: decimal('2000'),
              currency: 'SAR',
              paymentStatus: 'RESERVED',
            },
          ],
        },
      ]);

      const result = await service.getSummary('client-1');

      expect(result.payments.totalAmount).toBe(10000);
      expect(result.payments.releasedAmount).toBe(5000);
      expect(result.payments.pendingAmount).toBe(5000);
      expect(result.payments.currency).toBe('SAR');
    });

    it('rejects mixed-currency milestones with CLIENT_SUMMARY_MIXED_CURRENCY', async () => {
      clsService.get.mockReturnValue('freelancer-1');
      const client = {
        id: 'client-1',
        freelancerId: 'freelancer-1',
        name: 'Client Name',
        email: 'client@example.sa',
        phone: null,
        companyName: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      prismaService.client.findFirst.mockResolvedValue(client);
      prismaService.agreement.findMany.mockResolvedValue([
        {
          id: 'a1',
          status: 'ACTIVE',
          title: 'Agreement 1',
          totalAmount: decimal('5000'),
          currency: 'SAR',
          createdAt: new Date('2026-01-01'),
          milestones: [
            {
              amount: decimal('3000'),
              currency: 'SAR',
              paymentStatus: 'RELEASED',
            },
            {
              amount: decimal('2000'),
              currency: 'USD',
              paymentStatus: 'PENDING',
            },
          ],
        },
      ]);

      await expect(service.getSummary('client-1')).rejects.toMatchObject({
        code: ErrorCode.CLIENT_SUMMARY_MIXED_CURRENCY,
      });
    });

    it('returns at most five recent agreements ordered newest first', async () => {
      clsService.get.mockReturnValue('freelancer-1');
      const client = {
        id: 'client-1',
        freelancerId: 'freelancer-1',
        name: 'Client Name',
        email: 'client@example.sa',
        phone: null,
        companyName: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      prismaService.client.findFirst.mockResolvedValue(client);
      const agreements = Array.from({ length: 6 }, (_, i) => ({
        id: `a${i + 1}`,
        status: 'ACTIVE',
        title: `Agreement ${i + 1}`,
        totalAmount: decimal(1000),
        currency: 'SAR',
        createdAt: new Date(2026, 0, i + 1),
        milestones: [],
      })).reverse();
      prismaService.agreement.findMany.mockResolvedValue(agreements);

      const result = await service.getSummary('client-1');

      expect(result.recentAgreements.length).toBe(5);
      expect(result.recentAgreements[0].id).toBe('a6');
      expect(result.recentAgreements[4].id).toBe('a2');
    });

    it('excludes agreements belonging to other freelancers from summary totals', async () => {
      clsService.get.mockReturnValue('freelancer-a');
      const client = {
        id: 'client-a',
        freelancerId: 'freelancer-a',
        name: 'Client A',
        email: 'client@example.sa',
        phone: null,
        companyName: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      prismaService.client.findFirst.mockResolvedValue(client);
      prismaService.agreement.findMany.mockResolvedValue([
        {
          id: 'a1',
          status: 'ACTIVE',
          title: 'Owned',
          totalAmount: decimal(5000),
          currency: 'SAR',
          createdAt: new Date('2026-01-01'),
          milestones: [],
        },
      ]);

      const result = await service.getSummary('client-a');

      expect(prismaService.agreement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            clientId: 'client-a',
            freelancerId: 'freelancer-a',
          }),
        }),
      );
      expect(result.agreements.total).toBe(1);
    });

    it('does not write to agreements, milestones, payments, or other modules during getSummary', async () => {
      clsService.get.mockReturnValue('freelancer-1');
      const client = {
        id: 'client-1',
        freelancerId: 'freelancer-1',
        name: 'Client Name',
        email: 'client@example.sa',
        phone: null,
        companyName: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      prismaService.client.findFirst.mockResolvedValue(client);
      prismaService.agreement.findMany.mockResolvedValue([]);

      await service.getSummary('client-1');

      expect(prismaService.client.update).not.toHaveBeenCalled();
      expect(prismaService.agreement.findMany).toHaveBeenCalledTimes(1);
    });

    it('does not write to agreements, milestones, payments, or other modules during findOneOrCreateByEmail', async () => {
      clsService.get.mockReturnValue('freelancer-1');
      prismaService.client.findFirst.mockResolvedValue({
        id: 'client-1',
        freelancerId: 'freelancer-1',
        name: 'Existing Client',
        email: 'client@example.sa',
        phone: null,
        companyName: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      });

      await service.findOneOrCreateByEmail({
        email: 'client@example.sa',
        name: 'Any Name',
      });

      expect(prismaService.client.update).not.toHaveBeenCalled();
      expect(prismaService.agreement.findMany).not.toHaveBeenCalled();
    });
  });
});
