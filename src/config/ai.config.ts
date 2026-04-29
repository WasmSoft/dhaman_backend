import { registerAs } from '@nestjs/config';

export const aiConfig = registerAs('ai', () => ({
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
  geminiTimeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS ?? '30000', 10),
}));
