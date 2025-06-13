import { Server } from 'http';

export interface ProtooServiceInterface {
  initialize(httpServer: Server): void;
}
