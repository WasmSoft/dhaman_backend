import { PortalTokenType } from '../enums/portal-token-type.enum';

export type ClientPortalContext = {
  tokenId?: string;
  agreementId?: string;
  tokenType?: PortalTokenType;
};
