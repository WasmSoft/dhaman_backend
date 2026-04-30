/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
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
  $transaction: jest.Mock;
};

const mockClient = {
  id: 'c1a2b3c4-d5e6-7890-abcd-ef1234567890',
  freelancerId: 'freelancer-a-id',
  name: 'شركة التقنية',
  email: 'client@example.sa',
  phone: '+966501234567',
  companyName: 'شركة التقنية للحلول',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const mockClientMinimal = {
  id: 'c1a2b3c4-d5e6-7890-abcd-ef0000000001',
  freelancerId: 'freelancer-a-id',
  name: 'عميل جديد',
  email: 'minimal@example.sa',
  phone: null,
  companyName: null,
  createdAt: new Date('2026-01-02T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
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
      $transaction: jest.fn(),
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
        CHANGE_REQUESTED: 0,
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

  describe('create', () => {
    it('creates client with correct freelancerId from CLS', async () => {
      clsService.get.mockReturnValue('freelancer-a-id');
      prismaService.client.create.mockResolvedValue(mockClient);

      const dto = {
        name: 'شركة التقنية',
        email: 'client@example.sa',
        phone: '+966501234567',
        companyName: 'شركة التقنية للحلول',
      };
      await service.create(dto);

      expect(prismaService.client.create).toHaveBeenCalledWith({
        data: {
          freelancerId: 'freelancer-a-id',
          name: 'شركة التقنية',
          email: 'client@example.sa',
          phone: '+966501234567',
          companyName: 'شركة التقنية للحلول',
        },
      });
    });

    it('returns ClientResponseDto on success', async () => {
      clsService.get.mockReturnValue('freelancer-a-id');
      prismaService.client.create.mockResolvedValue(mockClient);

      const result = await service.create({
        name: mockClient.name,
        email: mockClient.email,
        phone: mockClient.phone,
        companyName: mockClient.companyName,
      });

      expect(result).toEqual({
        id: mockClient.id,
        name: mockClient.name,
        email: mockClient.email,
        phone: mockClient.phone,
        companyName: mockClient.companyName,
        createdAt: mockClient.createdAt,
        updatedAt: mockClient.updatedAt,
      });
    });

    it('normalizes email to lowercase before save', async () => {
      clsService.get.mockReturnValue('freelancer-a-id');
      prismaService.client.create.mockResolvedValue(mockClient);

      await service.create({
        name: 'Client',
        email: 'CLIENT@EXAMPLE.SA',
      });

      expect(prismaService.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'client@example.sa',
          }),
        }),
      );
    });

    it('normalizes email with surrounding whitespace', async () => {
      clsService.get.mockReturnValue('freelancer-a-id');
      prismaService.client.create.mockResolvedValue(mockClient);

      await service.create({
        name: 'Client',
        email: '  client@example.sa  ',
      });

      expect(prismaService.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'client@example.sa',
          }),
        }),
      );
    });

    it('throws CLIENT_EMAIL_ALREADY_EXISTS on P2002', async () => {
      clsService.get.mockReturnValue('freelancer-a-id');
      const prismaError = new Error('Unique constraint failed') as Error & {
        code: string;
      };
      prismaError.code = 'P2002';
      prismaService.client.create.mockRejectedValue(prismaError);

      await expect(
        service.create({
          name: 'Client',
          email: 'duplicate@example.sa',
        }),
      ).rejects.toMatchObject({
        code: ErrorCode.CLIENT_EMAIL_ALREADY_EXISTS,
      });
    });

    it('throws UNAUTHORIZED when CLS has no userId', async () => {
      clsService.get.mockReturnValue(undefined);

      await expect(
        service.create({
          name: 'Client',
          email: 'client@example.sa',
        }),
      ).rejects.toMatchObject({
        code: ErrorCode.UNAUTHORIZED,
      });
    });
  });

  describe('findAll', () => {
    it('returns paginated list with defaults (page=1, limit=20)', async () => {
      clsService.get.mockReturnValue('freelancer-a-id');
      prismaService.$transaction.mockResolvedValue([
        [mockClient, mockClientMinimal],
        2,
      ]);

      const result = await service.findAll({});

      expect(result).toEqual({
        data: [
          {
            id: mockClient.id,
            name: mockClient.name,
            email: mockClient.email,
            phone: mockClient.phone,
            companyName: mockClient.companyName,
            createdAt: mockClient.createdAt,
            updatedAt: mockClient.updatedAt,
          },
          {
            id: mockClientMinimal.id,
            name: mockClientMinimal.name,
            email: mockClientMinimal.email,
            phone: mockClientMinimal.phone,
            companyName: mockClientMinimal.companyName,
            createdAt: mockClientMinimal.createdAt,
            updatedAt: mockClientMinimal.updatedAt,
          },
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('uses custom page and limit', async () => {
      clsService.get.mockReturnValue('freelancer-a-id');
      prismaService.$transaction.mockResolvedValue([[], 0]);

      await service.findAll({ page: 2, limit: 5 });

      expect(prismaService.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
    });

    it('calculates totalPages correctly', async () => {
      clsService.get.mockReturnValue('freelancer-a-id');
      prismaService.$transaction.mockResolvedValue([[mockClient], 11]);

      const result = await service.findAll({ limit: 5 });

      expect(result.totalPages).toBe(3);
    });

    it('returns empty array and valid pagination for no clients', async () => {
      clsService.get.mockReturnValue('freelancer-a-id');
      prismaService.$transaction.mockResolvedValue([[], 0]);

      const result = await service.findAll({});

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
    });

    it('scopes query to freelancerId from CLS', async () => {
      clsService.get.mockReturnValue('freelancer-a-id');
      prismaService.$transaction.mockResolvedValue([[mockClient], 1]);

      await service.findAll({});

      expect(prismaService.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            freelancerId: 'freelancer-a-id',
          }),
        }),
      );
    });

    it('adds OR search filter when search provided', async () => {
      clsService.get.mockReturnValue('freelancer-a-id');
      prismaService.$transaction.mockResolvedValue([[mockClient], 1]);

      await service.findAll({ search: 'تقنية' });

      expect(prismaService.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'تقنية', mode: 'insensitive' } },
              { email: { contains: 'تقنية', mode: 'insensitive' } },
              { companyName: { contains: 'تقنية', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('does not add OR filter when search is absent', async () => {
      clsService.get.mockReturnValue('freelancer-a-id');
      prismaService.$transaction.mockResolvedValue([[mockClient], 1]);

      await service.findAll({});

      const callArgs = prismaService.client.findMany.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('OR');
    });

    it('throws UNAUTHORIZED when CLS has no userId', async () => {
      clsService.get.mockReturnValue(undefined);

      await expect(service.findAll({})).rejects.toMatchObject({
        code: ErrorCode.UNAUTHORIZED,
      });
    });
  });

  describe('getById', () => {
    it('returns ClientResponseDto for owned client', async () => {
      clsService.get.mockReturnValue('freelancer-a-id');
      prismaService.client.findFirst.mockResolvedValue(mockClient);

      const result = await service.getById(mockClient.id);

      expect(result).toEqual({
        id: mockClient.id,
        name: mockClient.name,
        email: mockClient.email,
        phone: mockClient.phone,
        companyName: mockClient.companyName,
        createdAt: mockClient.createdAt,
        updatedAt: mockClient.updatedAt,
      });
    });

    it('queries with both id and freelancerId', async () => {
      clsService.get.mockReturnValue('freelancer-a-id');
      prismaService.client.findFirst.mockResolvedValue(mockClient);

      await service.getById(mockClient.id);

      expect(prismaService.client.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockClient.id,
          freelancerId: 'freelancer-a-id',
        },
      });
    });

    it('throws CLIENT_NOT_FOUND for non-existent client', async () => {
      clsService.get.mockReturnValue('freelancer-a-id');
      prismaService.client.findFirst.mockResolvedValue(null);

      await expect(service.getById('nonexistent-id')).rejects.toMatchObject({
        code: ErrorCode.CLIENT_NOT_FOUND,
      });
    });

    it('throws CLIENT_NOT_FOUND for client owned by another freelancer', async () => {
      clsService.get.mockReturnValue('freelancer-b-id');
      prismaService.client.findFirst.mockResolvedValue(null);

      await expect(service.getById(mockClient.id)).rejects.toMatchObject({
        code: ErrorCode.CLIENT_NOT_FOUND,
      });
    });

    it('throws UNAUTHORIZED when CLS has no userId', async () => {
      clsService.get.mockReturnValue(undefined);

      await expect(service.getById(mockClient.id)).rejects.toMatchObject({
        code: ErrorCode.UNAUTHORIZED,
      });
    });
  });

  describe('update', () => {
    it('partially updates only provided fields', async () => {
      clsService.get.mockReturnValue('freelancer-a-id');
      const existingClient = { ...mockClient };
      const updatedClient = { ...mockClient, name: 'New Name' };
      prismaService.client.findFirst.mockResolvedValue(existingClient);
      prismaService.client.update.mockResolvedValue(updatedClient);

      await service.update(mockClient.id, { name: 'New Name' });

      expect(prismaService.client.update).toHaveBeenCalledWith({
        where: { id: mockClient.id },
        data: { name: 'New Name' },
      });
    });

    it('skips undefined fields — does not spread undefined into data', async () => {
      clsService.get.mockReturnValue('freelancer-a-id');
      const existingClient = { ...mockClient };
      prismaService.client.findFirst.mockResolvedValue(existingClient);
      prismaService.client.update.mockResolvedValue(mockClient);

      await service.update(mockClient.id, { name: 'X' });

      const updateData = prismaService.client.update.mock.calls[0][0].data;
      expect(updateData).not.toHaveProperty('email');
      expect(updateData).not.toHaveProperty('phone');
      expect(updateData).toHaveProperty('name');
    });

    it('normalizes email to lowercase on update', async () => {
      clsService.get.mockReturnValue('freelancer-a-id');
      const existingClient = { ...mockClient };
      const updatedClient = { ...mockClient, email: 'new@example.sa' };
      prismaService.client.findFirst.mockResolvedValue(existingClient);
      prismaService.client.update.mockResolvedValue(updatedClient);

      await service.update(mockClient.id, { email: 'NEW@EXAMPLE.SA' });

      expect(prismaService.client.update).toHaveBeenCalledWith({
        where: { id: mockClient.id },
        data: expect.objectContaining({
          email: 'new@example.sa',
        }),
      });
    });

    it('throws CLIENT_NOT_FOUND for non-existent client', async () => {
      clsService.get.mockReturnValue('freelancer-a-id');
      prismaService.client.findFirst.mockResolvedValue(null);

      await expect(
        service.update('nonexistent-id', { name: 'X' }),
      ).rejects.toMatchObject({
        code: ErrorCode.CLIENT_NOT_FOUND,
      });
    });

    it('throws CLIENT_NOT_FOUND for client owned by another freelancer', async () => {
      clsService.get.mockReturnValue('freelancer-b-id');
      prismaService.client.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockClient.id, { name: 'X' }),
      ).rejects.toMatchObject({
        code: ErrorCode.CLIENT_NOT_FOUND,
      });
    });

    it('throws CLIENT_EMAIL_ALREADY_EXISTS on P2002 during update', async () => {
      clsService.get.mockReturnValue('freelancer-a-id');
      prismaService.client.findFirst.mockResolvedValue(mockClient);
      const prismaError = new Error('Unique constraint failed') as Error & {
        code: string;
      };
      prismaError.code = 'P2002';
      prismaService.client.update.mockRejectedValue(prismaError);

      await expect(
        service.update(mockClient.id, { email: 'duplicate@example.sa' }),
      ).rejects.toMatchObject({
        code: ErrorCode.CLIENT_EMAIL_ALREADY_EXISTS,
      });
    });

    it('throws UNAUTHORIZED when CLS has no userId', async () => {
      clsService.get.mockReturnValue(undefined);

      await expect(
        service.update(mockClient.id, { name: 'X' }),
      ).rejects.toMatchObject({
        code: ErrorCode.UNAUTHORIZED,
      });
    });
  });
});
