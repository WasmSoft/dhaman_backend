import { registerAs } from '@nestjs/config';

export const emailConfig = registerAs('email', () => ({
  from: process.env.EMAIL_FROM ?? '',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
}));
