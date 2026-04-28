import { RequestContext } from '../cls/request-context.type';
import { AuthenticatedUser } from './authenticated-user.type';

declare module 'express-serve-static-core' {
  interface Request {
    requestContext?: RequestContext;
    user?: AuthenticatedUser;
  }
}
