import chalk from 'chalk';
import { createLogger, format, transports } from 'winston';

import { env } from './env';

const { combine, timestamp, printf, errors } = format;

// Custom color formatter for console
const colorFormat = printf(
  ({ level, message, timestamp, stack, service, context }) => {
    // Color coding for different log levels
    const levelColors = {
      error: chalk.red.bold,
      warn: chalk.yellow.bold,
      info: chalk.green.bold,
      debug: chalk.gray.bold,
    };

    const coloredLevel =
      level in levelColors
        ? levelColors[level as keyof typeof levelColors](
            level.toUpperCase().padEnd(5),
          )
        : level.toUpperCase().padEnd(5);
    const coloredTimestamp = chalk.gray(timestamp);

    let logMessage = `${coloredTimestamp} ${coloredLevel}`;

    if (service) {
      logMessage += ` ${chalk.cyan.bold(`[${service}]`)}`;
    }

    logMessage += ` ${chalk.white(stack || message)}`;

    if (context) {
      const contextStr = Object.entries(context)
        .map(([key, value]) => `${chalk.magenta(key)}=${chalk.green(value)}`)
        .join(chalk.gray(', '));
      logMessage += ` ${chalk.gray('|')}${contextStr}`;
    }

    return logMessage;
  },
);

// File format without colors
const fileFormat = printf(
  ({ level, message, timestamp, stack, service, context }) => {
    let logMessage = `${timestamp} [${level.toUpperCase().padEnd(5)}]`;

    if (service) {
      logMessage += ` [${service}]`;
    }

    logMessage += ` ${stack || message}`;

    if (context) {
      const contextStr = Object.entries(context)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
      logMessage += `|${contextStr}`;
    }

    return logMessage;
  },
);

export const logger = createLogger({
  level: env.LOG_LEVEL,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  ),
  transports: [
    // Console transport with colors
    new transports.Console({
      format: combine(
        errors({ stack: true }),
        timestamp({ format: 'HH:mm:ss' }), // Shorter timestamp for console
        colorFormat,
      ),
    }),
    // File transport for errors (no colors)
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        fileFormat,
      ),
    }),
    // File transport for all logs (no colors)
    new transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        fileFormat,
      ),
    }),
  ],
});

/**
 * Scoped Logger class - creates loggers with service names
 * Usage: const log = new Logger('ServiceName')
 */
export class Logger {
  private _serviceName: string;

  constructor(serviceName: string) {
    this._serviceName = serviceName;
  }

  info(
    message: string,
    methodName?: string,
    context?: Record<string, unknown>,
  ): void {
    // Include method in message if provided, not in service tag
    const fullMessage = methodName ? `${methodName}: ${message}` : message;
    logger.info(fullMessage, {
      service: this._serviceName,
      context,
    });
  }

  error(
    message: string,
    error?: Error,
    methodName?: string,
    context?: Record<string, unknown>,
  ): void {
    const fullMessage = methodName ? `${methodName}: ${message}` : message;
    if (error) {
      logger.error(fullMessage, error, {
        service: this._serviceName,
        context,
      });
    } else {
      logger.error(fullMessage, {
        service: this._serviceName,
        context,
      });
    }
  }

  warn(
    message: string,
    methodName?: string,
    context?: Record<string, unknown>,
  ): void {
    const fullMessage = methodName ? `${methodName}: ${message}` : message;
    logger.warn(fullMessage, {
      service: this._serviceName,
      context,
    });
  }

  debug(
    message: string,
    methodName?: string,
    context?: Record<string, unknown>,
  ): void {
    const fullMessage = methodName ? `${methodName}: ${message}` : message;
    logger.debug(fullMessage, {
      service: this._serviceName,
      context,
    });
  }

  /**
   * Time an operation and log the result
   */
  time<T>(
    operationName: string,
    operation: () => T | Promise<T>,
    methodName?: string,
    context?: Record<string, unknown>,
  ): T | Promise<T> {
    const start = Date.now();
    const result = operation();

    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = Date.now() - start;
        this.info(
          `${operationName} completed in ${duration}ms`,
          methodName,
          context,
        );
      });
    } else {
      const duration = Date.now() - start;
      this.info(
        `${operationName} completed in ${duration}ms`,
        methodName,
        context,
      );
      return result;
    }
  }
}
