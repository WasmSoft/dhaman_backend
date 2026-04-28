import { ActorType } from '../enums/actor-type.enum';
import { Locale } from '../enums/locale.enum';
import { UserRole } from '../enums/user-role.enum';

export type RequestContext = {
  requestId: string;
  correlationId: string;
  userId?: string;
  userRole?: UserRole;
  actorType: ActorType;
  portalTokenId?: string;
  agreementId?: string;
  locale: Locale;
  startedAt: Date;
};
