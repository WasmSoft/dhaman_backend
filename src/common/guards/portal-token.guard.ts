import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { ClsService } from '../cls/cls.service';
import { ActorType } from '../enums/actor-type.enum';
import { ErrorCode } from '../enums/error-code.enum';
import { AppException } from '../errors/app-exception';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class PortalTokenGuard implements CanActivate {
  constructor(
    private readonly clsService: ClsService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.params?.token as string | undefined;

    if (!token) {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    }

    const portalToken = await this.prisma.portalToken.findUnique({
      where: { tokenHash: createHash('sha256').update(token).digest('hex') },
      select: {
        id: true,
        agreementId: true,
        type: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!portalToken) {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_INVALID });
    }

    if (portalToken.revokedAt) {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_REVOKED });
    }

    if (portalToken.expiresAt && portalToken.expiresAt < new Date()) {
      throw new AppException({ code: ErrorCode.PORTAL_TOKEN_EXPIRED });
    }

    this.clsService.setContext({
      actorType: ActorType.CLIENT_PORTAL,
      portalTokenId: portalToken.id,
      agreementId: portalToken.agreementId,
      portalTokenType: portalToken.type,
    });

    return true;
  }
}
