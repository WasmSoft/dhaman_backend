import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ClsService } from '../cls/cls.service';
import { ActorType } from '../enums/actor-type.enum';

@Injectable()
export class PortalTokenGuard implements CanActivate {
  constructor(private readonly clsService: ClsService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.params?.token as string | undefined;

    this.clsService.setContext({
      actorType: ActorType.CLIENT_PORTAL,
      portalTokenId: token,
    });

    return true;
  }
}
