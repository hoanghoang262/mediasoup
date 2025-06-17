import { z } from 'zod';

/**
 * Environment variables validation schema
 */
const envSchema = z.object({
  // API Configuration
  VITE_API_URL: z.string().url('VITE_API_URL must be a valid URL'),
  VITE_API_TIMEOUT: z.string().transform(Number).pipe(
    z.number().min(1000, 'API timeout must be at least 1000ms')
  ),

  // WebSocket Configuration
  VITE_WS_URL: z.string().refine(
    (url) => url.startsWith('ws://') || url.startsWith('wss://'),
    'VITE_WS_URL must be a valid WebSocket URL'
  ),
  VITE_WS_RECONNECT_ATTEMPTS: z.string().transform(Number).pipe(
    z.number().min(1).max(10, 'Reconnect attempts must be between 1-10')
  ),
  VITE_WS_RECONNECT_DELAY: z.string().transform(Number).pipe(
    z.number().min(500, 'Reconnect delay must be at least 500ms')
  ),

  // Application Configuration
  VITE_APP_NAME: z.string().min(1, 'App name is required'),
  VITE_APP_VERSION: z.string().min(1, 'App version is required'),
  VITE_APP_ENVIRONMENT: z.enum(['development', 'production', 'staging']),

  // Media Configuration
  VITE_MEDIA_AUDIO_ENABLED: z.string().transform(val => val === 'true'),
  VITE_MEDIA_VIDEO_ENABLED: z.string().transform(val => val === 'true'),
  VITE_MEDIA_SCREEN_SHARE_ENABLED: z.string().transform(val => val === 'true'),

  // Logging Configuration
  VITE_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']),
  VITE_LOG_CONSOLE_ENABLED: z.string().transform(val => val === 'true'),
  VITE_LOG_REMOTE_ENABLED: z.string().transform(val => val === 'true'),

  // Feature Flags
  VITE_FEATURE_SCREEN_SHARING: z.string().transform(val => val === 'true'),
  VITE_FEATURE_CHAT: z.string().transform(val => val === 'true'),
  VITE_FEATURE_RECORDING: z.string().transform(val => val === 'true'),

  // Performance Configuration
  VITE_STATS_MODE: z.enum(['realtime', 'optimized', 'lazy']).default('lazy'),

  // TURN Server Configuration
  VITE_TURN_ENABLED: z.string().transform(val => val === 'true'),
  VITE_TURN_SERVER_URL: z.string().optional(),
  VITE_TURN_SERVER_USERNAME: z.string().optional(),
  VITE_TURN_SERVER_PASSWORD: z.string().optional(),
});

/**
 * Validated environment variables type
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validate and parse environment variables with logging
 */
function validateEnv(): EnvConfig {
  try {
    const result = envSchema.parse(import.meta.env);
    console.log('✅ Environment loaded:', result.VITE_APP_ENVIRONMENT);
    return result;
  } catch (error) {
    console.error('❌ Environment validation failed:');
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error('Invalid environment configuration');
  }
}

/**
 * Validated environment configuration
 * This will run validation immediately when imported
 */
export const env = validateEnv();

/**
 * Derived configuration objects
 */
export const apiConfig = {
  url: env.VITE_API_URL,
  timeout: env.VITE_API_TIMEOUT,
} as const;

export const wsConfig = {
  url: env.VITE_WS_URL,
  reconnectAttempts: env.VITE_WS_RECONNECT_ATTEMPTS,
  reconnectDelay: env.VITE_WS_RECONNECT_DELAY,
} as const;

export const appConfig = {
  name: env.VITE_APP_NAME,
  version: env.VITE_APP_VERSION,
  environment: env.VITE_APP_ENVIRONMENT,
} as const;

export const mediaConfig = {
  audio: env.VITE_MEDIA_AUDIO_ENABLED,
  video: env.VITE_MEDIA_VIDEO_ENABLED,
  screenShare: env.VITE_MEDIA_SCREEN_SHARE_ENABLED,
} as const;

export const logConfig = {
  level: env.VITE_LOG_LEVEL,
  console: env.VITE_LOG_CONSOLE_ENABLED,
  remote: env.VITE_LOG_REMOTE_ENABLED,
} as const;

export const featureFlags = {
  screenSharing: env.VITE_FEATURE_SCREEN_SHARING,
  chat: env.VITE_FEATURE_CHAT,
  recording: env.VITE_FEATURE_RECORDING,
} as const;

export const performanceConfig = {
  statsMode: env.VITE_STATS_MODE,
} as const;

export const turnConfig = {
  enabled: env.VITE_TURN_ENABLED,
  url: env.VITE_TURN_SERVER_URL,
  username: env.VITE_TURN_SERVER_USERNAME,
  password: env.VITE_TURN_SERVER_PASSWORD,
} as const;

/**
 * Environment helpers
 */
export const isDevelopment = appConfig.environment === 'development';
export const isProduction = appConfig.environment === 'production';
export const isStaging = appConfig.environment === 'staging';

/**
 * TURN server helpers
 */
export const isTurnEnabled = turnConfig.enabled;
export const isTurnConfigured = Boolean(
  turnConfig.url && turnConfig.username && turnConfig.password
);
export const shouldUseTurn = isTurnEnabled && isTurnConfigured;

// Log final configuration in development
if (isDevelopment) {
  console.log('🚀 App ready:', appConfig.name, appConfig.version);
  console.log('🔧 TURN Configuration:');
  console.log('   • Enabled:', isTurnEnabled ? '✅' : '❌');
  console.log('   • Configured:', isTurnConfigured ? '✅' : '❌');
  console.log('   • Will use TURN:', shouldUseTurn ? '✅' : '❌ (STUN-only)');
  if (isTurnEnabled && turnConfig.url) {
    console.log('   • Server:', turnConfig.url);
  }
} 