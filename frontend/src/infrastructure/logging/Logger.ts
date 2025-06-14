import { logConfig, isDevelopment } from '../../config/env.config';

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log level mapping
 */
const LOG_LEVEL_MAP = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
} as const;

/**
 * Log entry interface
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
  service?: string;
  userId?: string;
  sessionId?: string;
  meta?: Record<string, unknown>;
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  service: string;
  userId?: string;
  sessionId?: string;
}

/**
 * Performance measurement interface
 */
interface PerformanceMeasurement {
  name: string;
  startTime: number;
  context?: Record<string, unknown>;
}

/**
 * Enhanced Logger class with structured logging
 */
export class Logger {
  private config: LoggerConfig;
  private currentLogLevel: LogLevel;
  private performanceMeasurements = new Map<string, PerformanceMeasurement>();

  constructor(config: LoggerConfig) {
    this.config = config;
    this.currentLogLevel = LOG_LEVEL_MAP[logConfig.level];
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Info level logging
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Start performance measurement
   */
  startTimer(name: string, context?: Record<string, unknown>): void {
    this.performanceMeasurements.set(name, {
      name,
      startTime: performance.now(),
      context,
    });
  }

  /**
   * End performance measurement and log duration
   */
  endTimer(name: string, additionalContext?: Record<string, unknown>): number {
    const measurement = this.performanceMeasurements.get(name);
    if (!measurement) {
      this.warn(`Performance measurement '${name}' not found`);
      return 0;
    }

    const duration = performance.now() - measurement.startTime;
    this.performanceMeasurements.delete(name);

    const context = {
      ...measurement.context,
      ...additionalContext,
      duration: `${duration.toFixed(2)}ms`,
    };

    this.info(`Performance: ${name}`, context);
    return duration;
  }

  /**
   * Log method execution time
   */
  async timeAsync<T>(
    name: string,
    fn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    this.startTimer(name, context);
    try {
      const result = await fn();
      this.endTimer(name, { success: true });
      return result;
    } catch (error) {
      this.endTimer(name, { success: false });
      throw error;
    }
  }

  /**
   * Log function execution time (synchronous)
   */
  time<T>(
    name: string,
    fn: () => T,
    context?: Record<string, unknown>
  ): T {
    this.startTimer(name, context);
    try {
      const result = fn();
      this.endTimer(name, { success: true });
      return result;
    } catch (error) {
      this.endTimer(name, { success: false });
      throw error;
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: Partial<LoggerConfig>): Logger {
    return new Logger({
      ...this.config,
      ...additionalContext,
    });
  }

  /**
   * Update logger configuration
   */
  updateConfig(updates: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    // Skip if below current log level
    if (level < this.currentLogLevel) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      service: this.config.service,
      userId: this.config.userId,
      sessionId: this.config.sessionId,
      meta: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now(),
      },
    };

    // Console logging
    if (logConfig.console) {
      this.logToConsole(logEntry);
    }

    // Remote logging (only in production)
    if (logConfig.remote && !isDevelopment) {
      this.logToRemote(logEntry);
    }
  }

  /**
   * Log to browser console with styling
   */
  private logToConsole(entry: LogEntry): void {
    const levelStyles = {
      [LogLevel.DEBUG]: 'color: #6b7280; font-weight: normal',
      [LogLevel.INFO]: 'color: #059669; font-weight: normal',
      [LogLevel.WARN]: 'color: #d97706; font-weight: bold',
      [LogLevel.ERROR]: 'color: #dc2626; font-weight: bold',
    };

    const levelNames = {
      [LogLevel.DEBUG]: 'DEBUG',
      [LogLevel.INFO]: 'INFO',
      [LogLevel.WARN]: 'WARN',
      [LogLevel.ERROR]: 'ERROR',
    };

    const style = levelStyles[entry.level];
    const levelName = levelNames[entry.level];
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();

    console.log(
      `%c[${timestamp}] ${levelName} [${entry.service}] ${entry.message}`,
      style
    );

    // Log context if provided
    if (entry.context && Object.keys(entry.context).length > 0) {
      console.log('Context:', entry.context);
    }

    // Log error if provided
    if (entry.error) {
      console.error('Error:', entry.error);
    }
  }

  /**
   * Send logs to remote logging service
   */
  private async logToRemote(entry: LogEntry): Promise<void> {
    try {
      // Only send ERROR and WARN logs to remote in production
      if (entry.level < LogLevel.WARN) {
        return;
      }

      // This would be your remote logging endpoint
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry),
      // });
    } catch (error) {
      // Silently fail remote logging to avoid recursion
      console.warn('Failed to send log to remote service:', error);
    }
  }
}

/**
 * Create a logger instance
 */
export function createLogger(service: string, additionalConfig?: Partial<LoggerConfig>): Logger {
  return new Logger({
    service,
    sessionId: crypto.randomUUID(),
    ...additionalConfig,
  });
}

/**
 * Global logger instance for app-level logging
 */
export const appLogger = createLogger('App');

/**
 * Logger factory for specific services
 */
export const loggerFactory = {
  media: () => createLogger('Media'),
  websocket: () => createLogger('WebSocket'),
  api: () => createLogger('API'),
  ui: () => createLogger('UI'),
  meeting: () => createLogger('Meeting'),
}; 