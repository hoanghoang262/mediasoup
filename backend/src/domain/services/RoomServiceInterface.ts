import { RouterInterface } from './MediasoupServiceInterface';
import { Room } from '../entities/Room';

export interface RoomServiceInterface {
  createRoom(roomId: string): Promise<Room>;
  getOrCreateRoom(roomId: string): Promise<Room>;
  getRouter(roomId: string): RouterInterface | null;
  addParticipant(roomId: string, peerId: string): Promise<void>;
  removeParticipant(roomId: string, peerId: string): Promise<void>;
  closeRoom(roomId: string): Promise<void>;
  getRoomParticipants(roomId: string): Promise<string[]>;
}
