import { env } from './env';

import type { CorsOptions } from 'cors';

/**
 * Parse CORS origins from environment variable
 * Supports both string origins and regex patterns
 */
const parseOrigins = (originsStr: string): (string | RegExp)[] => {
  return originsStr
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .map((origin) => {
      // Support regex patterns for dynamic origins (e.g., for development)
      if (origin.startsWith('/') && origin.endsWith('/')) {
        return new RegExp(origin.slice(1, -1));
      }
      return origin;
    });
};

/**
 * CORS configuration for the application
 * Centralized configuration to avoid duplication
 */
export const corsConfig: CorsOptions = {
  // Parse and validate origins
  origin: parseOrigins(env.CORS_ALLOWED_ORIGINS),

  // HTTP methods allowed for CORS requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],

  // Headers allowed in CORS requests
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Requested-With',
    'Cache-Control',
    'X-CSRF-Token',
  ],

  // Allow credentials (cookies, authorization headers)
  credentials: true,

  // Cache preflight response for 24 hours
  maxAge: 86400,

  // Don't pass control to next handler after preflight
  preflightContinue: false,

  // Status code for successful OPTIONS requests (legacy browser support)
  optionsSuccessStatus: 204,
};

/**
 * Development-specific CORS configuration
 * More permissive for local development
 */
export const devCorsConfig: CorsOptions = {
  ...corsConfig,
  // Allow all origins in development
  origin: env.NODE_ENV === 'development' ? true : corsConfig.origin,
  // Additional headers for development tools
  allowedHeaders: [
    ...(corsConfig.allowedHeaders as string[]),
    'X-Debug-Token',
    'X-Development-Mode',
  ],
};

/**
 * Get appropriate CORS configuration based on environment
 */
export const getCorsConfig = (): CorsOptions => {
  return env.NODE_ENV === 'development' ? devCorsConfig : corsConfig;
};
