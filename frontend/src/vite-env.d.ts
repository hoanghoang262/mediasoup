/// <reference types="vite/client" />

interface ImportMetaEnv {
  // API Configuration
  readonly VITE_API_URL: string;
  readonly VITE_API_TIMEOUT: string;

  // WebSocket Configuration
  readonly VITE_WS_URL: string;
  readonly VITE_WS_RECONNECT_ATTEMPTS: string;
  readonly VITE_WS_RECONNECT_DELAY: string;

  // Application Configuration
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_APP_ENVIRONMENT: string;

  // Media Configuration
  readonly VITE_MEDIA_AUDIO_ENABLED: string;
  readonly VITE_MEDIA_VIDEO_ENABLED: string;
  readonly VITE_MEDIA_SCREEN_SHARE_ENABLED: string;

  // Logging Configuration
  readonly VITE_LOG_LEVEL: string;
  readonly VITE_LOG_CONSOLE_ENABLED: string;
  readonly VITE_LOG_REMOTE_ENABLED: string;

  // Feature Flags
  readonly VITE_FEATURE_SCREEN_SHARING: string;
  readonly VITE_FEATURE_CHAT: string;
  readonly VITE_FEATURE_RECORDING: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
