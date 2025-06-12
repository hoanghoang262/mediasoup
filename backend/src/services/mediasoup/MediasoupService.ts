import { types as MediasoupTypes } from 'mediasoup';

import { mediasoupWorkerManager } from './MediasoupWorkerManager';
import { logger } from '../../config/logger';
import { mediasoupConfig } from '../../config/mediasoup';

export class MediasoupService {
  public async initialize(numWorkers = 4): Promise<void> {
    await mediasoupWorkerManager.initialize(numWorkers);
  }

  public async createRouter(roomId: string): Promise<MediasoupTypes.Router> {
    const workerInfo = mediasoupWorkerManager.getNextWorker();

    try {
      const router = await workerInfo.worker.createRouter({
        mediaCodecs: mediasoupConfig.router.mediaCodecs,
      });

      workerInfo.router = router;
      workerInfo.appData.routerId = roomId;

      logger.info(
        `Router created for room ${roomId} on worker ${workerInfo.worker.pid}`,
      );

      return router;
    } catch (error) {
      logger.error(`Error creating router for room ${roomId}:`, error);
      throw error;
    }
  }

  public getRouter(roomId: string): MediasoupTypes.Router | null {
    const workerInfo = mediasoupWorkerManager.findWorkerByRoomId(roomId);
    return workerInfo?.router || null;
  }

  public async closeRouter(roomId: string): Promise<void> {
    const workerInfo = mediasoupWorkerManager.findWorkerByRoomId(roomId);

    if (workerInfo?.router) {
      workerInfo.router.close();
      workerInfo.router = null;
      workerInfo.appData.routerId = null;
      logger.info(`Router closed for room ${roomId}`);
    }
  }

  public async close(): Promise<void> {
    await mediasoupWorkerManager.closeAllWorkers();
  }
}

export const mediasoupService = new MediasoupService();
