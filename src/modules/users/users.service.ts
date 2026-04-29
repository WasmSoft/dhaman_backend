import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app-exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { ClsService } from '../../common/cls/cls.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { UpdateCurrentUserDto, UpdateUserDto, UpdateUserProfileDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly cls: ClsService,
    private readonly prisma: PrismaService,
  ) {}

  async getMe() {
    const userId = this.cls.get('userId');
    if (!userId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      omit: { passwordHash: true },
    });

    if (!user) {
      throw new AppException({ code: ErrorCode.AUTH_USER_NOT_FOUND });
    }

    return user;
  }

  getCurrentUser() {
    return this.getMe();
  }

  async updateMe(dto: UpdateUserDto) {
    const userId = this.cls.get('userId');
    if (!userId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    const data = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );

    if (Object.keys(data).length === 0) {
      return this.getMe();
    }

    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data,
        omit: { passwordHash: true },
      });
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new AppException({ code: ErrorCode.AUTH_USER_NOT_FOUND });
      }

      throw error;
    }
  }

  updateCurrentUser(dto: UpdateCurrentUserDto) {
    return this.updateMe(dto);
  }

  async getProfile() {
    const userId = this.cls.get('userId');
    if (!userId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new AppException({ code: ErrorCode.AUTH_USER_NOT_FOUND });
    }

    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, preferredCurrency: 'SAR', locale: 'ar' },
      update: {},
    });
  }

  async updateProfile(dto: UpdateUserProfileDto) {
    const userId = this.cls.get('userId');
    if (!userId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new AppException({ code: ErrorCode.AUTH_USER_NOT_FOUND });
    }

    const updates = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );

    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, preferredCurrency: 'SAR', locale: 'ar', ...updates },
      update: updates,
    });
  }
}
