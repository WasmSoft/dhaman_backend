import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ClsService } from '../cls/cls.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ActorType } from '../enums/actor-type.enum';
import { ErrorCode } from '../enums/error-code.enum';
import { AppException } from '../errors/app-exception';
import { AuthenticatedUser } from '../types/authenticated-user.type';

type RequestWithUser = {
  user?: AuthenticatedUser;
};

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly clsService: ClsService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const canActivate = (await super.canActivate(context)) as boolean;
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    this.clsService.setContext({
      actorType: ActorType.FREELANCER,
      userId: user.id,
      userRole: user.role,
    });

    return canActivate;
  }

  // AR: يترجم أخطاء توثيق الرمز إلى رموز أخطاء مستقرة ومترجمة.
  // EN: Maps token authentication failures to stable localized error codes.
  handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: AuthenticatedUser | false,
    info: unknown,
  ): TUser {
    if (user) {
      return user as TUser;
    }

    throw new AppException({ code: this.getAuthErrorCode(info ?? err) });
  }

  private getAuthErrorCode(info: unknown): ErrorCode {
    const name = this.getInfoField(info, 'name');
    const message = this.getInfoField(info, 'message');

    if (name === 'TokenExpiredError') {
      return ErrorCode.AUTH_TOKEN_EXPIRED;
    }

    if (!info || message === 'No auth token') {
      return ErrorCode.UNAUTHORIZED;
    }

    return ErrorCode.AUTH_TOKEN_INVALID;
  }

  private getInfoField(
    info: unknown,
    field: 'message' | 'name',
  ): string | undefined {
    if (typeof info === 'string') {
      return field === 'message' ? info : undefined;
    }

    if (typeof info !== 'object' || info === null || !(field in info)) {
      return undefined;
    }

    const value = (info as Record<'message' | 'name', unknown>)[field];
    return typeof value === 'string' ? value : undefined;
  }
}
