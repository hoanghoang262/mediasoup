import { Logger, createLogger } from '../../infrastructure/logging/Logger';
import type { AsyncResult, EventCallback } from '../types/common';

/**
 * Base service configuration
 */
export interface BaseServiceConfig {
  name: string;
  enableLogging?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Service error with context
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

/**
 * Base service class with common functionality
 */
export abstract class BaseService {
  protected readonly logger: Logger;
  protected readonly config: Required<BaseServiceConfig>;
  private readonly eventListeners = new Map<string, Set<EventCallback>>();

  constructor(config: BaseServiceConfig) {
    this.config = {
      enableLogging: true,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    };
    
    this.logger = createLogger(this.config.name);
    
    if (this.config.enableLogging) {
      this.logger.info(`${this.config.name} service initialized`);
    }
  }

  /**
   * Execute operation with error handling and logging
   */
  protected async executeWithLogging<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    return this.logger.timeAsync(
      operationName,
      async () => {
        try {
          this.logger.debug(`Starting ${operationName}`, context);
          const result = await operation();
          this.logger.debug(`Completed ${operationName}`, { ...context, success: true });
          return result;
        } catch (error) {
          this.logger.error(
            `Failed ${operationName}`,
            error instanceof Error ? error : new Error(String(error)),
            { ...context, success: false }
          );
          throw error;
        }
      },
      context
    );
  }

  /**
   * Execute operation with retry logic
   */
  protected async executeWithRetry<T>(
    operationName: string,
    operation: () => Promise<T>,
    maxAttempts = this.config.retryAttempts,
    delay = this.config.retryDelay,
    context?: Record<string, unknown>
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.executeWithLogging(
          `${operationName} (attempt ${attempt}/${maxAttempts})`,
          operation,
          { ...context, attempt, maxAttempts }
        );
        
        if (attempt > 1) {
          this.logger.info(`${operationName} succeeded after ${attempt} attempts`);
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxAttempts) {
          this.logger.error(
            `${operationName} failed after ${maxAttempts} attempts`,
            lastError,
            context
          );
          break;
        }
        
        this.logger.warn(
          `${operationName} attempt ${attempt} failed, retrying in ${delay}ms`,
          { error: lastError.message, ...context }
        );
        
        await this.delay(delay);
        delay *= 1.5; // Exponential backoff
      }
    }
    
    throw lastError!;
  }

  /**
   * Execute operation and return result with error handling
   */
  protected async safeExecute<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<AsyncResult<T>> {
    try {
      const data = await this.executeWithLogging(operationName, operation, context);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Add event listener
   */
  protected addEventListener(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  protected removeEventListener(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  protected emitEvent<T = unknown>(event: string, data?: T): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this.logger.error(
            `Error in event listener for '${event}'`,
            error instanceof Error ? error : new Error(String(error))
          );
        }
      });
    }
  }

  /**
   * Create service error with context
   */
  protected createError(
    message: string,
    code?: string,
    context?: Record<string, unknown>
  ): ServiceError {
    return new ServiceError(message, code, context);
  }

  /**
   * Validate required parameters
   */
  protected validateRequired<T>(
    params: Record<string, T>,
    operationName?: string
  ): void {
    const missing = Object.entries(params)
      .filter(([, value]) => value === undefined || value === null)
      .map(([key]) => key);

    if (missing.length > 0) {
      const message = `Missing required parameters: ${missing.join(', ')}`;
      this.logger.error(message, undefined, { operation: operationName, missing });
      throw this.createError(message, 'MISSING_PARAMETERS', { missing });
    }
  }

  /**
   * Delay execution
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  protected cleanup(): void {
    this.eventListeners.clear();
    this.logger.info(`${this.config.name} service cleaned up`);
  }

  /**
   * Get service health status
   */
  public getHealth(): { name: string; status: 'healthy' | 'unhealthy'; timestamp: string } {
    return {
      name: this.config.name,
      status: 'healthy', // Override in child classes with actual health check
      timestamp: new Date().toISOString(),
    };
  }
} 