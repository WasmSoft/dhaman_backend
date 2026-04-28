import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  secret: process.env.JWT_SECRET ?? '',
}));
