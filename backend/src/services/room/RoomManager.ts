import { types as MediasoupTypes } from 'mediasoup';
import * as protoo from 'protoo-server';

import {
  RoomInterface,
  RoomInfoInterface,
  RoomManagerInterface,
  ParticipantInterface,
} from './types';
import { logger } from '../../config/logger';
import { mediasoupService } from '../mediasoup/MediasoupService';

export class RoomManager implements RoomManagerInterface {
  private readonly _rooms: Map<string, RoomInterface> = new Map();

  public async createRoom(roomId: string): Promise<RoomInterface> {
    if (this._rooms.has(roomId)) {
      throw new Error(`Room ${roomId} already exists`);
    }

    try {
      const router = await mediasoupService.createRouter(roomId);
      const protooRoom = new protoo.Room();

      const room: RoomInterface = {
        id: roomId,
        router,
        protooRoom,
        participants: new Map(),
        createdAt: new Date(),
      };

      this._rooms.set(roomId, room);

      logger.info('🏠 Room created', {
        roomId,
        timestamp: new Date().toISOString(),
      });

      return room;
    } catch (error) {
      logger.error('Failed to create room', {
        roomId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async getOrCreateRoom(roomId: string): Promise<RoomInterface> {
    const existingRoom = this._rooms.get(roomId);
    if (existingRoom) {
      return existingRoom;
    }
    return this.createRoom(roomId);
  }

  public getRoom(roomId: string): RoomInterface | undefined {
    return this._rooms.get(roomId);
  }

  public getRouter(roomId: string): MediasoupTypes.Router | null {
    const room = this._rooms.get(roomId);
    return room ? room.router : null;
  }

  public addParticipant(roomId: string, peerId: string): void {
    const room = this._rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    const participant: ParticipantInterface = {
      id: peerId,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
      joinedAt: Date.now(),
    };

    room.participants.set(peerId, participant);

    logger.info('👥 Participant joined room', {
      roomId,
      peerId,
      participantCount: room.participants.size,
    });
  }

  public removeParticipant(roomId: string, peerId: string): void {
    const room = this._rooms.get(roomId);
    if (!room) {
      return;
    }

    room.participants.delete(peerId);

    logger.info('👤 Participant left room', {
      roomId,
      peerId,
      participantCount: room.participants.size,
    });

    // If room is empty, schedule it for cleanup
    if (room.participants.size === 0) {
      setTimeout(() => {
        // Double-check if still empty
        if (room.participants.size === 0) {
          this.closeRoom(roomId).catch((error) => {
            logger.error('Failed to close empty room', {
              roomId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          });
        }
      }, 60000); // 1 minute delay
    }
  }

  public async closeRoom(roomId: string): Promise<void> {
    const room = this._rooms.get(roomId);
    if (!room) {
      return;
    }

    try {
      await mediasoupService.closeRouter(roomId);
      this._rooms.delete(roomId);

      logger.info('🏚️ Room closed', {
        roomId,
        duration: `${(Date.now() - room.createdAt.getTime()) / 1000}s`,
      });
    } catch (error) {
      logger.error('Failed to close room', {
        roomId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public getRoomParticipants(roomId: string): string[] {
    const room = this._rooms.get(roomId);
    if (!room) {
      return [];
    }
    return Array.from(room.participants.keys());
  }

  public getRoomInfo(roomId: string): RoomInfoInterface | null {
    const room = this._rooms.get(roomId);
    if (!room) {
      return null;
    }

    return {
      id: room.id,
      participants: room.participants,
      createdAt: room.createdAt,
    };
  }

  public getAllRooms(): RoomInfoInterface[] {
    return Array.from(this._rooms.values()).map((room) => ({
      id: room.id,
      participants: room.participants,
      createdAt: room.createdAt,
    }));
  }
}

export const roomManager = new RoomManager();
