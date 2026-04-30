import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { defineConfig } from 'prisma/config';

if (existsSync('.env')) {
  loadEnvFile('.env');
}

export default defineConfig({
  migrations: {
    seed: 'ts-node --project tsconfig.json prisma/seed.ts',
  },
  schema: 'prisma/schema',
});
