import * as mediasoup from 'mediasoup';
import { types as MediasoupTypes } from 'mediasoup';

import { logger } from '../../config/logger';

export interface WorkerInfoInterface {
  worker: MediasoupTypes.Worker;
  router: MediasoupTypes.Router | null;
  appData: {
    routerId: string | null;
  };
}

export class MediasoupWorkerManager {
  private _workers: WorkerInfoInterface[] = [];
  private _nextWorkerIndex = 0;

  /**
   * Initialize the worker manager by creating mediasoup workers
   */
  public async initialize(numWorkers = 4): Promise<void> {
    logger.info(`Initializing ${numWorkers} MediaSoup workers`);

    for (let i = 0; i < numWorkers; i++) {
      try {
        const worker = await mediasoup.createWorker({
          logLevel: 'warn',
          logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
        });

        worker.on('died', () => {
          logger.error(`Worker ${worker.pid} died, exiting...`);
          setTimeout(() => process.exit(1), 2000);
        });

        this._workers.push({
          worker,
          router: null,
          appData: {
            routerId: null,
          },
        });

        logger.info(
          `Worker ${i + 1}/${numWorkers} created with PID ${worker.pid}`,
        );
      } catch (error) {
        logger.error(`Error creating worker: ${error}`);
        throw error;
      }
    }
  }

  /**
   * Get the next worker using round-robin
   */
  public getNextWorker(): WorkerInfoInterface {
    const worker = this._workers[this._nextWorkerIndex];
    this._nextWorkerIndex = (this._nextWorkerIndex + 1) % this._workers.length;
    return worker;
  }

  /**
   * Find a worker by room ID
   */
  public findWorkerByRoomId(roomId: string): WorkerInfoInterface | undefined {
    return this._workers.find(
      (workerInfo) => workerInfo.appData.routerId === roomId,
    );
  }

  /**
   * Close all workers
   */
  public async closeAllWorkers(): Promise<void> {
    logger.info('Closing all MediaSoup workers');

    for (const workerInfo of this._workers) {
      try {
        workerInfo.worker.close();
      } catch (error) {
        logger.error(`Error closing worker: ${error}`);
      }
    }

    this._workers = [];
    logger.info('All MediaSoup workers closed');
  }
}

export const mediasoupWorkerManager = new MediasoupWorkerManager();
