import { types as MediasoupTypes } from 'mediasoup';

export interface MediasoupServiceInterface {
  initialize(numWorkers?: number): Promise<void>;
  createRouter(roomId: string): Promise<MediasoupTypes.Router>;
  getRouter(roomId: string): MediasoupTypes.Router | null;
  closeRouter(roomId: string): Promise<void>;
  close(): Promise<void>;
}
