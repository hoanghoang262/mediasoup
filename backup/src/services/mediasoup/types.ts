import { types as MediasoupTypes } from 'mediasoup';

export interface WorkerInfoInterface {
  worker: MediasoupTypes.Worker;
  router: MediasoupTypes.Router | null;
  webRtcServer: MediasoupTypes.WebRtcServer | null;
  appData: {
    routerId: string | null;
  };
}

export interface MediasoupWorkerManagerInterface {
  initialize(numWorkers: number): Promise<void>;
  getNextWorker(): WorkerInfoInterface;
  closeAllWorkers(): Promise<void>;
}
