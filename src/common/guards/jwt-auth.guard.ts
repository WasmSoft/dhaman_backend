import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from '../cls/cls.service';
import { ActorType } from '../enums/actor-type.enum';
import { ErrorCode } from '../enums/error-code.enum';
import { AppException } from '../errors/app-exception';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly clsService: ClsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    this.clsService.setContext({
      actorType: ActorType.FREELANCER,
      userId: user.id,
      userRole: user.role,
    });

    return true;
  }
}
