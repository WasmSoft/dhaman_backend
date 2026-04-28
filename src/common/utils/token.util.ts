import { randomBytes } from 'node:crypto';

export function generateSecureToken(size = 32): string {
  return randomBytes(size).toString('hex');
}
