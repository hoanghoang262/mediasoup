import { z } from 'zod';

export const envSchema = z.object({
  // Server configuration
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development')
    .describe('Application environment'),

  PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(3000)
    .describe('Port number to listen on'),

  HOST: z
    .string()
    .min(1)
    .default('localhost')
    .describe('Host address to bind to'),

  // CORS configuration
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:5174')
    .describe('Comma-separated list of allowed CORS origins'),

  // MediaSoup configuration
  MEDIASOUP_LISTEN_IP: z
    .string()
    .default('0.0.0.0')
    .describe('IP address for MediaSoup to listen on'),

  MEDIASOUP_ANNOUNCED_IP: z
    .string()
    .default('127.0.0.1')
    .describe('Public IP address for WebRTC connections'),

  // Logging configuration
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'http', 'debug'])
    .default('info')
    .describe('Logging level'),

  LOG_FORMAT: z
    .enum(['json', 'pretty'])
    .default('pretty')
    .describe('Logging format'),
});

export type EnvType = z.infer<typeof envSchema>;
