import { registerAs } from '@nestjs/config';
import { Locale } from '../common/enums/locale.enum';

export const appConfig = registerAs('app', () => ({
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',
  defaultLocale:
    (process.env.DEFAULT_LOCALE as Locale | undefined) ?? Locale.AR,
  enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'false',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3001',
}));
