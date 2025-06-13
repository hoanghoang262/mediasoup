import { mediasoupWorkerManager } from './MediasoupWorkerManager';
import {
  MediasoupServiceInterface,
  RouterInterface,
} from '../../../domain/services/MediasoupServiceInterface';
import { logger } from '../../config/logger';
import { mediasoupConfig } from '../../config/mediasoup';

export class MediasoupService implements MediasoupServiceInterface {
  public async initialize(numWorkers = 4): Promise<void> {
    await mediasoupWorkerManager.initialize(numWorkers);
  }

  public async createRouter(roomId: string): Promise<RouterInterface> {
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

      return {
        id: router.id,
        roomId,
        internal: router,
      };
    } catch (error) {
      logger.error(`Error creating router for room ${roomId}:`, error);
      throw error;
    }
  }

  public getRouter(roomId: string): RouterInterface | null {
    const workerInfo = mediasoupWorkerManager.findWorkerByRoomId(roomId);

    if (!workerInfo?.router) {
      return null;
    }

    return {
      id: workerInfo.router.id,
      roomId,
      internal: workerInfo.router,
    };
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
