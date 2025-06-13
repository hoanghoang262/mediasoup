import { types as MediasoupTypes } from 'mediasoup';
import * as protoo from 'protoo-server';

export interface ParticipantInterface {
  id: string;
  transports: Map<string, MediasoupTypes.WebRtcTransport>;
  producers: Map<string, MediasoupTypes.Producer>;
  consumers: Map<string, MediasoupTypes.Consumer>;
  joinedAt: number;
}

export interface RoomInterface {
  id: string;
  router: MediasoupTypes.Router;
  protooRoom: protoo.Room;
  participants: Map<string, ParticipantInterface>;
  createdAt: Date;
}

export interface RoomInfoInterface {
  id: string;
  participants: Map<string, ParticipantInterface>;
  createdAt: Date;
}

export interface RoomManagerInterface {
  createRoom(roomId: string): Promise<RoomInterface>;
  getOrCreateRoom(roomId: string): Promise<RoomInterface>;
  getRouter(roomId: string): MediasoupTypes.Router | null;
  getRoom(roomId: string): RoomInterface | undefined;
  addParticipant(roomId: string, peerId: string): void;
  removeParticipant(roomId: string, peerId: string): void;
  closeRoom(roomId: string): Promise<void>;
  getRoomParticipants(roomId: string): string[];
  getRoomInfo(roomId: string): RoomInfoInterface | null;
  getAllRooms(): RoomInfoInterface[];
}
