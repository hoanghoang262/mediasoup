import { z } from 'zod';

export const envSchema = z.object({
  // Runtime Environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .describe('Application environment'),

  // Server Configuration
  PORT: z.coerce
    .number()
    .int()
    .min(0)
    .max(65535)
    .describe('Port number to listen on'),

  // CORS Configuration (sensitive - deployment specific)
  CORS_ALLOWED_ORIGINS: z
    .string()
    .describe('Comma-separated list of allowed CORS origins'),

  // Logging Configuration
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'http', 'debug', 'silent'])
    .describe('Logging level'),

  LOG_FORMAT: z.enum(['json', 'pretty']).describe('Logging format'),

  // MediaSoup Configuration (sensitive - public IP)
  MEDIASOUP_ANNOUNCED_IP: z
    .string()
    .optional()
    .describe('Public IP address for WebRTC connections'),
});

export type EnvType = z.infer<typeof envSchema>;
