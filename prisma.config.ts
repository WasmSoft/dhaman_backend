import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { defineConfig } from 'prisma/config';

loadEnvFile(existsSync('.env') ? '.env' : '.env.example');

export default defineConfig({
  schema: 'prisma/schema',
});
