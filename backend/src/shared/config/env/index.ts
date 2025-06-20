import { join } from 'path';

import { config } from 'dotenv';

import { envSchema, type EnvType } from './schema';

function loadEnvFile(): void {
  const nodeEnv = process.env.NODE_ENV || 'development';

  let envFile: string;
  switch (nodeEnv) {
    case 'production':
      envFile = '.env.production';
      break;
    case 'test':
      envFile = '.env.test';
      break;
    default:
      envFile = '.env.development';
  }

  // Load from backend/env folder
  const envPath = join(process.cwd(), 'env', envFile);

  const result = config({ path: envPath });

  if (result.error) {
    console.error(`❌ Failed to load ${envFile}: ${result.error.message}`);
    process.exit(1);
  }

  // Log loaded env file path (will be picked up by Winston once configured)
  console.log(`Loaded environment from: ${envPath}`);
}

function validateEnv(): EnvType {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Environment validation failed');
    console.error(parsed.error.format());
    process.exit(1);
  }

  console.log('✅ Environment validation successful');
  return parsed.data;
}

// Load and validate environment
loadEnvFile();
export const env = validateEnv();
