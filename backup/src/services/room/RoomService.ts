import { types as MediasoupTypes } from 'mediasoup';

import { roomManager } from './RoomManager';
import { RoomInfoInterface, RoomInterface } from './types';

export class RoomService {
  public async createRoom(roomId: string): Promise<RoomInterface> {
    return roomManager.createRoom(roomId);
  }

  public async getOrCreateRoom(roomId: string): Promise<RoomInterface> {
    return roomManager.getOrCreateRoom(roomId);
  }

  public getRouter(roomId: string): MediasoupTypes.Router | null {
    return roomManager.getRouter(roomId);
  }

  public addParticipant(roomId: string, peerId: string): void {
    roomManager.addParticipant(roomId, peerId);
  }

  public removeParticipant(roomId: string, peerId: string): void {
    roomManager.removeParticipant(roomId, peerId);
  }

  public async closeRoom(roomId: string): Promise<void> {
    await roomManager.closeRoom(roomId);
  }

  public getRoomParticipants(roomId: string): string[] {
    return roomManager.getRoomParticipants(roomId);
  }

  public getRoomInfo(roomId: string): RoomInfoInterface | null {
    return roomManager.getRoomInfo(roomId);
  }

  public getAllRooms(): RoomInfoInterface[] {
    return roomManager.getAllRooms();
  }
}

export const roomService = new RoomService();
