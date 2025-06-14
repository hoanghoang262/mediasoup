// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - Disable TypeScript for this file due to protoo-client compatibility issues
import { Peer, WebSocketTransport } from 'protoo-client';
import { BaseService, type BaseServiceConfig } from '../../shared/services/BaseService';
import { wsConfig } from '../../config/env.config';
import type { ConnectionStatus, EventCallback } from '../../shared/types/common';

/**
 * Connection service configuration
 */
export interface ConnectionServiceConfig extends BaseServiceConfig {
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
}

/**
 * Connection state
 */
export interface ConnectionState {
  status: ConnectionStatus;
  peerId: string;
  roomId: string;
  reconnectAttempt: number;
  lastConnectedAt?: string;
  lastDisconnectedAt?: string;
}

/**
 * Message handler type
 */
export type MessageHandler = (method: string, data: Record<string, unknown>) => void | Promise<void>;

/**
 * Request handler type  
 */
export type RequestHandler = (method: string, data: Record<string, unknown>) => unknown | Promise<unknown>;

/**
 * WebSocket connection service with clean architecture
 */
export class ConnectionService extends BaseService {
  private peer: Peer | null = null;
  private connectionState: ConnectionState;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private lastHeartbeatTime = 0;
  private messageHandlers = new Map<string, MessageHandler>();
  private requestHandlers = new Map<string, RequestHandler>();

  constructor(config: Partial<ConnectionServiceConfig> = {}) {
    super({
      name: 'WebSocketConnection',
      retryAttempts: wsConfig.reconnectAttempts,
      retryDelay: wsConfig.reconnectDelay,
      ...config,
    });

    this.connectionState = {
      status: 'disconnected',
      peerId: '',
      roomId: '',
      reconnectAttempt: 0,
    };
  }

  /**
   * Connect to WebSocket server
   */
  public async connect(roomId: string, peerId: string): Promise<void> {
    this.validateRequired({ roomId, peerId }, 'connect');

    if (this.isConnected() && this.connectionState.roomId === roomId && this.connectionState.peerId === peerId) {
      this.logger.info('Already connected to the same room with same peer ID');
      return;
    }

    await this.executeWithLogging(
      'WebSocket Connection',
      async () => {
        this.updateConnectionState({
          status: 'connecting',
          roomId,
          peerId,
          reconnectAttempt: 0,
        });

        // Clean up existing connection
        await this.disconnect();

        // Create WebSocket URL
        const wsUrl = `${wsConfig.url}?roomId=${encodeURIComponent(roomId)}&peerId=${encodeURIComponent(peerId)}`;
        this.logger.debug('Connecting to WebSocket', { url: wsUrl });

        // Create transport and peer
        const transport = new WebSocketTransport(wsUrl);
        this.peer = new Peer(transport);

        // Set connection timeout
        this.setConnectionTimeout();

        // Setup event handlers
        this.setupPeerEventHandlers();

        // Wait for connection to establish
        await this.waitForConnection();
      },
      { roomId, peerId }
    );
  }

  /**
   * Disconnect from WebSocket server
   */
  public async disconnect(): Promise<void> {
    await this.executeWithLogging(
      'WebSocket Disconnection',
      async () => {
        this.clearTimeouts();
        
        if (this.peer) {
          this.peer.close();
          this.peer = null;
        }

        this.updateConnectionState({
          status: 'disconnected',
          lastDisconnectedAt: new Date().toISOString(),
        });
      }
    );
  }

  /**
   * Send request to server
   */
  public async request<T = unknown>(method: string, data?: Record<string, unknown>): Promise<T> {
    if (!this.peer || !this.isConnected()) {
      throw this.createError('Not connected to server', 'NOT_CONNECTED');
    }

    return this.executeWithLogging(
      `Request: ${method}`,
      async () => {
        const response = await this.peer!.request(method, data);
        return response as T;
      },
      { method, data }
    );
  }

  /**
   * Send notification to server
   */
  public async notify(method: string, data?: Record<string, unknown>): Promise<void> {
    if (!this.peer || !this.isConnected()) {
      throw this.createError('Not connected to server', 'NOT_CONNECTED');
    }

    await this.executeWithLogging(
      `Notification: ${method}`,
      async () => {
        await this.peer!.request(method, data);
      },
      { method, data }
    );
  }

  /**
   * Register message handler
   */
  public onMessage(method: string, handler: MessageHandler): void {
    this.messageHandlers.set(method, handler);
    this.logger.debug(`Registered handler for method: ${method}`);
  }

  /**
   * Register request handler
   */
  public onRequest(method: string, handler: RequestHandler): void {
    this.requestHandlers.set(method, handler);
    this.logger.debug(`Registered request handler for method: ${method}`);
  }

  /**
   * Remove message handler
   */
  public offMessage(method: string): void {
    this.messageHandlers.delete(method);
    this.logger.debug(`Removed handler for method: ${method}`);
  }

  /**
   * Remove request handler
   */
  public offRequest(method: string): void {
    this.requestHandlers.delete(method);
    this.logger.debug(`Removed request handler for method: ${method}`);
  }

  /**
   * Add connection event listener
   */
  public on(event: string, callback: EventCallback): void {
    this.addEventListener(event, callback);
  }

  /**
   * Remove connection event listener
   */
  public off(event: string, callback: EventCallback): void {
    this.removeEventListener(event, callback);
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.connectionState.status === 'connected' && this.peer !== null;
  }

  /**
   * Check if connecting
   */
  public isConnecting(): boolean {
    return this.connectionState.status === 'connecting';
  }

  /**
   * Force reconnection
   */
  public async reconnect(): Promise<void> {
    const { roomId, peerId } = this.connectionState;
    if (roomId && peerId) {
      await this.connect(roomId, peerId);
    }
  }

  /**
   * Get service health
   */
  public getHealth(): { name: string; status: 'healthy' | 'unhealthy'; timestamp: string } {
    return {
      ...super.getHealth(),
      status: this.isConnected() ? ('healthy' as const) : ('unhealthy' as const),
    };
  }

  /**
   * Setup peer event handlers
   */
  private setupPeerEventHandlers(): void {
    if (!this.peer) return;

    this.peer.on('open', () => {
      this.clearConnectionTimeout();
      this.logger.info('WebSocket connection opened');
      
      this.updateConnectionState({
        status: 'connected',
        reconnectAttempt: 0,
        lastConnectedAt: new Date().toISOString(),
      });

      this.startHeartbeat();
      this.emitEvent('connected', this.connectionState);
    });

    this.peer.on('close', () => {
      this.logger.info('WebSocket connection closed');
      this.clearTimeouts();
      
      if (this.connectionState.status === 'connected') {
        this.updateConnectionState({
          status: 'disconnected',
          lastDisconnectedAt: new Date().toISOString(),
        });
        
        this.emitEvent('disconnected', this.connectionState);
        this.tryReconnect();
      }
    });

    this.peer.on('error', (error: unknown) => {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('WebSocket connection error', errorObj);
      this.emitEvent('error', errorObj);
      
      if (this.connectionState.status === 'connected') {
        this.updateConnectionState({ status: 'failed' });
        this.tryReconnect();
      }
    });

    this.peer.on('notification', (notification: unknown) => {
      this.handleNotification(notification);
      this.updateHeartbeat();
    });

    this.peer.on('request', async (request: { method?: string; data?: Record<string, unknown> }, accept: (result?: unknown) => void, reject: (error: Error) => void) => {
      try {
        const handler = this.requestHandlers.get(request.method || '');
        if (handler) {
          const result = await handler(request.method || '', request.data || {});
          accept(result);
        } else {
          reject(new Error(`No handler for request method: ${request.method}`));
        }
      } catch (error) {
        this.logger.error('Error handling request', error as Error);
        reject(error as Error);
      }
    });
  }

  /**
   * Handle incoming notifications
   */
  private async handleNotification(notification: unknown): Promise<void> {
    try {
      const notif = notification as { method?: string; data?: Record<string, unknown> };
      const method = notif.method || '';
      const data = notif.data || {};

      // Handle ping notifications
      if (method === 'ping') {
        this.updateHeartbeat();
        return;
      }

      // Find and execute handler
      const handler = this.messageHandlers.get(method);
      if (handler) {
        await handler(method, data);
      } else {
        this.logger.warn(`No handler for notification method: ${method}`, { method, data });
      }
    } catch (error) {
      this.logger.error('Error handling notification', error as Error);
    }
  }

  /**
   * Wait for connection to establish
   */
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connectionState.status === 'connected') {
        resolve();
        return;
      }

      const connectHandler = () => {
        this.removeEventListener('connected', connectHandler);
        this.removeEventListener('error', errorHandler);
        resolve();
      };

      const errorHandler = (error: Error) => {
        this.removeEventListener('connected', connectHandler);
        this.removeEventListener('error', errorHandler);
        reject(error);
      };

      this.addEventListener('connected', connectHandler);
      this.addEventListener('error', errorHandler);
    });
  }

  /**
   * Set connection timeout
   */
  private setConnectionTimeout(): void {
    this.connectionTimeout = setTimeout(() => {
      if (this.connectionState.status === 'connecting') {
        this.logger.error('Connection timeout after 10 seconds');
        this.updateConnectionState({ status: 'failed' });
        this.emitEvent('error', new Error('Connection timeout'));
      }
    }, 10000);
  }

  /**
   * Clear connection timeout
   */
  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.updateHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeatTime;
      
      if (timeSinceLastHeartbeat > 15000) { // 15 seconds without activity
        this.logger.warn('No heartbeat activity, checking connection');
        this.checkConnection();
      }
    }, 5000);
  }

  /**
   * Clear heartbeat monitoring
   */
  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Update heartbeat timestamp
   */
  private updateHeartbeat(): void {
    this.lastHeartbeatTime = Date.now();
  }

  /**
   * Check connection health
   */
  private async checkConnection(): Promise<void> {
    if (!this.peer || !this.isConnected()) return;

    try {
      await Promise.race([
        this.peer.request('ping', {}),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 5000))
      ]);
      
      this.updateHeartbeat();
      this.logger.debug('Connection health check passed');
    } catch (error) {
      this.logger.error('Connection health check failed', error as Error);
      this.updateConnectionState({ status: 'failed' });
      this.emitEvent('disconnected', this.connectionState);
      this.tryReconnect();
    }
  }

  /**
   * Attempt to reconnect
   */
  private async tryReconnect(): Promise<void> {
    const { roomId, peerId } = this.connectionState;
    
    if (!roomId || !peerId || this.connectionState.reconnectAttempt >= wsConfig.reconnectAttempts) {
      this.logger.error('Max reconnection attempts reached or missing connection info');
      this.updateConnectionState({ status: 'failed' });
      this.emitEvent('reconnectFailed', this.connectionState);
      return;
    }

    if (this.reconnectTimeout) {
      return; // Already attempting to reconnect
    }

    const attempt = this.connectionState.reconnectAttempt + 1;
    const delay = Math.min(wsConfig.reconnectDelay * Math.pow(1.5, attempt - 1), 10000);

    this.updateConnectionState({
      status: 'reconnecting',
      reconnectAttempt: attempt,
    });

    this.logger.info(`Attempting to reconnect in ${delay}ms (attempt ${attempt}/${wsConfig.reconnectAttempts})`);
    this.emitEvent('reconnecting', this.connectionState);

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      
      try {
        await this.connect(roomId, peerId);
        this.emitEvent('reconnected', this.connectionState);
      } catch (error) {
        this.logger.error('Reconnection attempt failed', error as Error);
        this.tryReconnect(); // Try again
      }
    }, delay);
  }

  /**
   * Clear all timeouts
   */
  private clearTimeouts(): void {
    this.clearConnectionTimeout();
    this.clearHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Update connection state and emit event
   */
  private updateConnectionState(updates: Partial<ConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...updates };
    this.emitEvent('stateChange', this.connectionState);
  }

  /**
   * Cleanup service
   */
  protected cleanup(): void {
    this.clearTimeouts();
    this.messageHandlers.clear();
    this.requestHandlers.clear();
    
    if (this.peer) {
      this.peer.close();
      this.peer = null;
    }
    
    super.cleanup();
  }
} 