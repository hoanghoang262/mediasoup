export interface RouterInterface {
  id: string;
  roomId: string;
  [key: string]: unknown;
}

export interface MediasoupServiceInterface {
  initialize(numWorkers?: number): Promise<void>;
  createRouter(roomId: string): Promise<RouterInterface>;
  getRouter(roomId: string): RouterInterface | null;
  closeRouter(roomId: string): Promise<void>;
  close(): Promise<void>;
}
