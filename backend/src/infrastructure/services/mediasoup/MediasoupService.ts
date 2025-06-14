import { MediasoupWorkerManager } from './MediasoupWorkerManager';
import { MediasoupServiceInterface } from '../../../domain/services/MediasoupServiceInterface';
import { Logger } from '../../../shared/config/logger';

import type { types as mediasoupTypes } from 'mediasoup';

const log = new Logger('mediasoup');

export class MediasoupService implements MediasoupServiceInterface {
  private _workerManager: MediasoupWorkerManager;
  private _routers: Map<string, mediasoupTypes.Router> = new Map();

  constructor() {
    this._workerManager = new MediasoupWorkerManager();
  }

  async initialize(): Promise<void> {
    await this._workerManager.initialize();
  }

  async createRouter(roomId: string): Promise<mediasoupTypes.Router> {
    try {
      log.info(`Creating MediaSoup router for room ${roomId}`, 'createRouter', {
        roomId,
      });

      const worker = this._workerManager.getWorker();
      const router = await worker.createRouter({
        mediaCodecs: [
          {
            kind: 'audio',
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2,
          },
          {
            kind: 'video',
            mimeType: 'video/VP8',
            clockRate: 90000,
          },
          {
            kind: 'video',
            mimeType: 'video/H264',
            clockRate: 90000,
            parameters: {
              'packetization-mode': 1,
              'profile-level-id': '42e01f',
            },
          },
        ],
      });

      this._routers.set(roomId, router);
      return router;
    } catch (error) {
      log.error(
        `Error creating router for room ${roomId}`,
        error instanceof Error ? error : new Error(String(error)),
        'createRouter',
        { roomId },
      );
      throw error;
    }
  }

  getRouter(roomId: string): mediasoupTypes.Router | null {
    return this._routers.get(roomId) || null;
  }

  async closeRouter(roomId: string): Promise<void> {
    const router = this._routers.get(roomId);
    if (router) {
      router.close();
      this._routers.delete(roomId);
      log.info(`Router closed for room ${roomId}`, 'closeRouter', { roomId });
    }
  }

  async close(): Promise<void> {
    // Close all routers
    for (const [, router] of this._routers) {
      router.close();
    }
    this._routers.clear();

    // Close worker manager
    await this._workerManager.close();
  }
}
