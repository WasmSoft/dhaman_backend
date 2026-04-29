import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User, UserRole as PrismaUserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuthResponseDto, LoginDto, RegisterDto, UserProfileDto } from './dto';

type AuthTokenUser = Pick<User, 'id' | 'role'>;

/**
 * Module responsibility:
 * - Registration, login, and current-user auth flows.
 * Main entities touched:
 * - User, AuditLog.
 * Expected endpoints:
 * - POST /auth/register
 * - POST /auth/login
 * - GET /auth/me
 * Business rules:
 * - Enforce unique email ownership.
 * - Issue JWT access tokens.
 * - Resolve authenticated freelancer context.
 * Implementation phases:
 * - Phase 1.
 * Error cases to document:
 * - AUTH_INVALID_CREDENTIALS, AUTH_EMAIL_ALREADY_EXISTS, AUTH_USER_NOT_FOUND.
 * Testing cases to cover:
 * - successful registration, duplicate email, invalid login, current-user fetch.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // AR: ينشئ حساب مستقل جديد ويعيد رمز الدخول مع ملف آمن.
  // EN: Creates a freelancer account and returns an auth response with a safe profile.
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const email = this.normalizeEmail(dto.email);
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw this.authException(ErrorCode.AUTH_EMAIL_ALREADY_EXISTS);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      const createdUser = await this.prisma.user.create({
        data: {
          email,
          name: dto.name,
          passwordHash,
          role: PrismaUserRole.FREELANCER,
        },
      });

      return {
        accessToken: this.generateToken(createdUser),
        user: this.toUserProfile(createdUser),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw this.authException(ErrorCode.AUTH_EMAIL_ALREADY_EXISTS);
      }

      throw error;
    }
  }

  // AR: يتحقق من بيانات الدخول دون كشف وجود البريد الإلكتروني.
  // EN: Validates credentials without revealing whether the email exists.
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user?.passwordHash) {
      throw this.authException(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw this.authException(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    return {
      accessToken: this.generateToken(user),
      user: this.toUserProfile(user),
    };
  }

  // AR: يعيد الملف الآمن للمستخدم المصادق عليه عبر معرفه.
  // EN: Returns the safe profile for the authenticated user id.
  async getMe(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw this.authException(ErrorCode.AUTH_USER_NOT_FOUND);
    }

    return this.toUserProfile(user);
  }

  // AR: ينشئ رمز دخول بحمولة صغيرة تحتوي على معرف المستخدم ودوره فقط.
  // EN: Creates a minimal auth token payload with only user id and role.
  generateToken(user: AuthTokenUser): string {
    return this.jwtService.sign({
      role: user.role,
      sub: user.id,
    });
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private toUserProfile(user: User): UserProfileDto {
    return {
      avatarUrl: user.avatarUrl,
      email: user.email,
      id: user.id,
      name: user.name,
      role: user.role as UserRole,
    };
  }

  private authException(code: ErrorCode): AppException {
    return new AppException({ code });
  }
}
