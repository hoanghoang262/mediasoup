import * as mediasoup from 'mediasoup';
import { types as MediasoupTypes } from 'mediasoup';

import { Logger } from '../../../shared/config/logger';

const log = new Logger('MediasoupWorker');

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
    log.info(`Initializing ${numWorkers} MediaSoup workers`, 'initialize', {
      numWorkers,
    });

    for (let i = 0; i < numWorkers; i++) {
      try {
        const worker = await mediasoup.createWorker({
          logLevel: 'warn',
          logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
        });

        worker.on('died', () => {
          log.error(
            `Worker ${worker.pid} died, exiting...`,
            undefined,
            'worker-died',
          );
          setTimeout(() => process.exit(1), 2000);
        });

        this._workers.push({
          worker,
          router: null,
          appData: {
            routerId: null,
          },
        });

        log.info(
          `Worker ${i + 1}/${numWorkers} created with PID ${worker.pid}`,
          'initialize',
          { workerIndex: i + 1, totalWorkers: numWorkers, pid: worker.pid },
        );
      } catch (error) {
        log.error(
          `Error creating worker`,
          error instanceof Error ? error : new Error(String(error)),
          'initialize',
        );
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
   * Get a worker (for compatibility)
   */
  public getWorker(): MediasoupTypes.Worker {
    return this.getNextWorker().worker;
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
    log.info('Closing all MediaSoup workers', 'closeAllWorkers');

    for (const workerInfo of this._workers) {
      try {
        workerInfo.worker.close();
      } catch (error) {
        log.error(
          `Error closing worker`,
          error instanceof Error ? error : new Error(String(error)),
          'closeAllWorkers',
        );
      }
    }

    this._workers = [];
    log.info('All MediaSoup workers closed', 'closeAllWorkers');
  }

  /**
   * Close method for compatibility
   */
  public async close(): Promise<void> {
    await this.closeAllWorkers();
  }
}

export const mediasoupWorkerManager = new MediasoupWorkerManager();
