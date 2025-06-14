import { RoomManager } from './RoomManager';
import { ParticipantInterface } from '../../../domain/entities/Participant';
import { Room } from '../../../domain/entities/Room';
import { RoomServiceInterface } from '../../../domain/services/RoomServiceInterface';

export class RoomService implements RoomServiceInterface {
  constructor(private readonly _roomManager: RoomManager) {}

  async createRoom(roomId: string): Promise<Room> {
    return this._roomManager.getOrCreateRoom(roomId);
  }

  async getOrCreateRoom(roomId: string): Promise<Room> {
    return this._roomManager.getOrCreateRoom(roomId);
  }

  async addParticipant(roomId: string, peerId: string): Promise<void> {
    await this._roomManager.addParticipant(roomId, peerId);
  }

  async removeParticipant(roomId: string, peerId: string): Promise<void> {
    await this._roomManager.removeParticipant(roomId, peerId);
  }

  async closeRoom(roomId: string): Promise<void> {
    await this._roomManager.closeRoom(roomId);
  }

  getRoomParticipants(roomId: string): string[] {
    return this._roomManager.getRoomParticipants(roomId);
  }

  getRoomInfo(roomId: string): {
    id: string;
    participants: Map<string, ParticipantInterface>;
    createdAt: Date;
  } | null {
    // TODO: Implement this method to return domain room info
    // This would need domain repository access to get the Room entity
    // For now, we can return basic info from the infrastructure participants
    const participants = this._roomManager.getRoomParticipants(roomId);
    if (participants.length === 0) {
      return null;
    }

    return {
      id: roomId,
      participants: new Map(), // Would need to convert from infrastructure participants
      createdAt: new Date(), // Would need to get from domain room
    };
  }

  getAllRooms(): {
    id: string;
    participants: Map<string, ParticipantInterface>;
    createdAt: Date;
  }[] {
    // TODO: Implement this method to return all domain rooms
    // This would need domain repository access to get all Room entities
    return [];
  }
}
