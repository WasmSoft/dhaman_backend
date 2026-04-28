import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestContext as RequestContextType } from '../cls/request-context.type';

export const RequestContext = createParamDecorator(
  (
    _data: unknown,
    context: ExecutionContext,
  ): RequestContextType | undefined => {
    const request = context.switchToHttp().getRequest();
    return request.requestContext as RequestContextType | undefined;
  },
);
