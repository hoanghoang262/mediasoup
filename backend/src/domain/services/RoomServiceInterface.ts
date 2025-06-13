import { ParticipantInterface } from '../entities/Participant';
import { Room } from '../entities/Room';

export interface RoomServiceInterface {
  createRoom(roomId: string): Promise<Room>;
  getOrCreateRoom(roomId: string): Promise<Room>;
  addParticipant(roomId: string, peerId: string): Promise<void>;
  removeParticipant(roomId: string, peerId: string): Promise<void>;
  closeRoom(roomId: string): Promise<void>;
  getRoomParticipants(roomId: string): string[];
  getRoomInfo(roomId: string): {
    id: string;
    participants: Map<string, ParticipantInterface>;
    createdAt: Date;
  } | null;
  getAllRooms(): {
    id: string;
    participants: Map<string, ParticipantInterface>;
    createdAt: Date;
  }[];
}
