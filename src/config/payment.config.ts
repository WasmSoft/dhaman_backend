import { registerAs } from '@nestjs/config';

export const paymentConfig = registerAs('payment', () => ({
  mode: process.env.PAYMENT_MODE ?? 'demo',
  clientPortalTokenSecret: process.env.CLIENT_PORTAL_TOKEN_SECRET ?? '',
}));
