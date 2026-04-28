import { JwtService } from '@nestjs/jwt';
import { Prisma, User, UserRole as PrismaUserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AuthService } from '../../modules/auth/auth.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const hashMock = bcrypt.hash as jest.MockedFunction<
  (data: string, saltOrRounds: number) => Promise<string>
>;
const compareMock = bcrypt.compare as jest.MockedFunction<
  (data: string, encrypted: string) => Promise<boolean>
>;

type PrismaServiceMock = {
  user: {
    create: jest.Mock;
    findUnique: jest.Mock;
  };
};

function createUser(overrides: Partial<User> = {}): User {
  return {
    avatarUrl: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    email: 'sara@example.com',
    id: 'user-1',
    name: 'Sara Ahmed',
    passwordHash: 'hashed-password',
    role: PrismaUserRole.FREELANCER,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

async function expectAppException(
  promise: Promise<unknown>,
  code: ErrorCode,
): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code });
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaServiceMock;
  let jwtService: { sign: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
    };
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('creates a freelancer with a normalized email and hashed password', async () => {
      const createdUser = createUser({
        email: 'sara@example.com',
        name: 'Sara Ahmed',
        passwordHash: 'hashed-password',
      });
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(createdUser);
      hashMock.mockResolvedValue('hashed-password');

      const result = await service.register({
        email: ' SARA@Example.COM ',
        name: 'Sara Ahmed',
        password: 'Str0ngPassw0rd!',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'sara@example.com' },
      });
      expect(hashMock).toHaveBeenCalledWith('Str0ngPassw0rd!', 12);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'sara@example.com',
          name: 'Sara Ahmed',
          passwordHash: 'hashed-password',
          role: PrismaUserRole.FREELANCER,
        },
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        role: PrismaUserRole.FREELANCER,
        sub: 'user-1',
      });
      expect(result).toEqual({
        accessToken: 'signed-token',
        user: {
          avatarUrl: null,
          email: 'sara@example.com',
          id: 'user-1',
          name: 'Sara Ahmed',
          role: PrismaUserRole.FREELANCER,
        },
      });
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('rejects duplicate emails before creating a user', async () => {
      prisma.user.findUnique.mockResolvedValue(createUser());

      await expectAppException(
        service.register({
          email: 'sara@example.com',
          name: 'Sara Ahmed',
          password: 'Str0ngPassw0rd!',
        }),
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
      );

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('maps a concurrent unique email violation to the auth duplicate error', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      hashMock.mockResolvedValue('hashed-password');
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          clientVersion: 'test',
          code: 'P2002',
        }),
      );

      await expectAppException(
        service.register({
          email: 'sara@example.com',
          name: 'Sara Ahmed',
          password: 'Str0ngPassw0rd!',
        }),
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
      );
    });
  });

  describe('login', () => {
    it('returns an auth response for valid credentials', async () => {
      const user = createUser();
      prisma.user.findUnique.mockResolvedValue(user);
      compareMock.mockResolvedValue(true);

      const result = await service.login({
        email: ' SARA@Example.COM ',
        password: 'Str0ngPassw0rd!',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'sara@example.com' },
      });
      expect(compareMock).toHaveBeenCalledWith(
        'Str0ngPassw0rd!',
        'hashed-password',
      );
      expect(result.accessToken).toBe('signed-token');
      expect(result.user.email).toBe('sara@example.com');
    });

    it('rejects an unknown email without comparing passwords', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expectAppException(
        service.login({
          email: 'missing@example.com',
          password: 'Str0ngPassw0rd!',
        }),
        ErrorCode.AUTH_INVALID_CREDENTIALS,
      );

      expect(compareMock).not.toHaveBeenCalled();
    });

    it('rejects a wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(createUser());
      compareMock.mockResolvedValue(false);

      await expectAppException(
        service.login({
          email: 'sara@example.com',
          password: 'wrong-password',
        }),
        ErrorCode.AUTH_INVALID_CREDENTIALS,
      );
    });

    it('rejects users without a password hash', async () => {
      prisma.user.findUnique.mockResolvedValue(
        createUser({ passwordHash: null }),
      );

      await expectAppException(
        service.login({
          email: 'sara@example.com',
          password: 'Str0ngPassw0rd!',
        }),
        ErrorCode.AUTH_INVALID_CREDENTIALS,
      );

      expect(compareMock).not.toHaveBeenCalled();
    });
  });

  describe('getMe', () => {
    it('returns the safe user profile for the authenticated user id', async () => {
      prisma.user.findUnique.mockResolvedValue(createUser({ id: 'user-42' }));

      const result = await service.getMe('user-42');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-42' },
      });
      expect(result).toEqual({
        avatarUrl: null,
        email: 'sara@example.com',
        id: 'user-42',
        name: 'Sara Ahmed',
        role: PrismaUserRole.FREELANCER,
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('rejects a token subject that no longer maps to a user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expectAppException(
        service.getMe('deleted-user'),
        ErrorCode.AUTH_USER_NOT_FOUND,
      );
    });
  });

  describe('generateToken', () => {
    it('signs only the user id and role', () => {
      const token = service.generateToken({
        id: 'admin-1',
        role: PrismaUserRole.ADMIN,
      });

      expect(token).toBe('signed-token');
      expect(jwtService.sign).toHaveBeenCalledWith({
        role: PrismaUserRole.ADMIN,
        sub: 'admin-1',
      });
    });
  });
});
