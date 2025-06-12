import * as mediasoup from 'mediasoup';

import { WorkerInfoInterface, MediasoupWorkerManagerInterface } from './types';
import { logger } from '../../config/logger';
import { mediasoupConfig } from '../../config/mediasoup';

export class MediasoupWorkerManager implements MediasoupWorkerManagerInterface {
  private _workers: WorkerInfoInterface[] = [];
  private _nextWorkerIndex = 0;

  public async initialize(numWorkers = 4): Promise<void> {
    logger.info(`Initializing ${numWorkers} mediasoup workers...`);

    try {
      for (let i = 0; i < numWorkers; i++) {
        const worker = await mediasoup.createWorker({
          logLevel: mediasoupConfig.worker.logLevel,
          logTags: mediasoupConfig.worker.logTags,
          rtcMinPort: mediasoupConfig.worker.rtcMinPort,
          rtcMaxPort: mediasoupConfig.worker.rtcMaxPort,
        });

        worker.on('died', () => {
          logger.error(
            `Worker ${worker.pid} died, exiting in 2 seconds... [${worker.pid}]`,
          );
          setTimeout(() => process.exit(1), 2000);
        });

        const workerInfo: WorkerInfoInterface = {
          worker,
          router: null,
          webRtcServer: null,
          appData: {
            routerId: null,
          },
        };

        // Create WebRTC server for this worker
        const webRtcServer = await worker.createWebRtcServer({
          listenInfos: [
            {
              protocol: 'udp',
              ip: mediasoupConfig.webRtcTransport.listenIps[0].ip,
              announcedIp:
                mediasoupConfig.webRtcTransport.listenIps[0].announcedIp ||
                undefined,
              port: 50000 + i * 100, // Use very high port range to avoid conflicts
            },
            {
              protocol: 'tcp',
              ip: mediasoupConfig.webRtcTransport.listenIps[0].ip,
              announcedIp:
                mediasoupConfig.webRtcTransport.listenIps[0].announcedIp ||
                undefined,
              port: 50100 + i * 100, // Use very high port range to avoid conflicts
            },
          ],
        });

        workerInfo.webRtcServer = webRtcServer;
        this._workers.push(workerInfo);
        logger.info(
          `Worker ${i + 1}/${numWorkers} created [pid: ${worker.pid}]`,
        );
      }

      logger.info('All mediasoup workers created successfully');
    } catch (error) {
      logger.error('Failed to initialize mediasoup workers:', error);
      throw error;
    }
  }

  public getNextWorker(): WorkerInfoInterface {
    const workerInfo = this._workers[this._nextWorkerIndex];
    this._nextWorkerIndex = (this._nextWorkerIndex + 1) % this._workers.length;
    return workerInfo;
  }

  public findWorkerByRoomId(roomId: string): WorkerInfoInterface | undefined {
    return this._workers.find((w) => w.appData.routerId === roomId);
  }

  public async closeAllWorkers(): Promise<void> {
    logger.info('Closing all mediasoup workers...');
    const closePromises = this._workers.map(({ worker }) => worker.close());
    await Promise.all(closePromises);
    this._workers.length = 0;
    logger.info('All mediasoup workers closed');
  }
}

export const mediasoupWorkerManager = new MediasoupWorkerManager();
