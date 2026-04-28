import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCode } from '../enums/error-code.enum';
import { AppException } from '../errors/app-exception';
import { UserRole } from '../enums/user-role.enum';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: UserRole } | undefined;

    if (!user?.role) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    if (!requiredRoles.includes(user.role)) {
      throw new AppException({ code: ErrorCode.FORBIDDEN });
    }

    return true;
  }
}
