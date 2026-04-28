import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Locale as LocaleEnum } from '../enums/locale.enum';

export const Locale = createParamDecorator(
  (_data: unknown, context: ExecutionContext): LocaleEnum => {
    const request = context.switchToHttp().getRequest();
    return (
      (request.requestContext?.locale as LocaleEnum | undefined) ??
      LocaleEnum.AR
    );
  },
);
