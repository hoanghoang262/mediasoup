import { types as MediasoupTypes } from 'mediasoup';
import * as protoo from 'protoo-server';

import {
  InfrastructureParticipantInterface,
  RoomMediaInfoInterface,
} from './types';
import { Participant } from '../../../domain/entities/Participant';
import { Room } from '../../../domain/entities/Room';
import { RoomRepositoryInterface } from '../../../domain/repositories/RoomRepository';
import { MediasoupServiceInterface } from '../../../domain/services/MediasoupServiceInterface';
import { logger } from '../../../shared/config/logger';

export class RoomManager {
  private _rooms: Map<string, RoomMediaInfoInterface> = new Map();

  constructor(
    private readonly _roomRepository: RoomRepositoryInterface,
    private readonly _mediasoupService: MediasoupServiceInterface,
  ) {}

  async getOrCreateRoom(roomId: string): Promise<Room> {
    // Try to get existing room from domain repository
    let room = await this._roomRepository.findById(roomId);

    if (!room) {
      // Create new domain room
      room = Room.create(roomId);
      await this._roomRepository.save(room);
      logger.info(`Created new room: ${roomId}`);
    }

    // Ensure infrastructure room exists
    await this.ensureInfrastructureRoom(roomId);

    return room;
  }

  private async ensureInfrastructureRoom(roomId: string): Promise<void> {
    if (this._rooms.has(roomId)) {
      return;
    }

    // Create mediasoup router
    const router = await this._mediasoupService.createRouter(roomId);

    // Create protoo room
    const protooRoom = new protoo.Room();

    // Store infrastructure room info
    this._rooms.set(roomId, {
      participants: new Map(),
      router,
      protooRoom,
    });

    logger.info(`Infrastructure room created: ${roomId}`);
  }

  async addParticipant(roomId: string, peerId: string): Promise<void> {
    // Add to domain room
    const room = await this._roomRepository.findById(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    const participant = Participant.create(peerId);
    room.addParticipant(peerId, participant);
    await this._roomRepository.save(room);

    logger.info(`Participant ${peerId} added to room ${roomId}`);
  }

  async removeParticipant(roomId: string, peerId: string): Promise<void> {
    // Remove from domain room
    const room = await this._roomRepository.findById(roomId);
    if (room) {
      room.removeParticipant(peerId);
      await this._roomRepository.save(room);
    }

    // Remove from infrastructure
    const roomInfo = this._rooms.get(roomId);
    if (roomInfo) {
      const participant = roomInfo.participants.get(peerId);
      if (participant) {
        // Cleanup media resources
        participant.producers.forEach((producer) => producer.close());
        participant.consumers.forEach((consumer) => consumer.close());
        participant.transports.forEach((transport) => transport.close());

        roomInfo.participants.delete(peerId);
      }
    }

    // Close room if empty
    if (room && room.isEmpty()) {
      await this.closeRoom(roomId);
    }

    logger.info(`Participant ${peerId} removed from room ${roomId}`);
  }

  async closeRoom(roomId: string): Promise<void> {
    // Remove from domain - find room first, then delete if it exists
    const room = await this._roomRepository.findById(roomId);
    if (room) {
      await this._roomRepository.delete(roomId);
    }

    // Cleanup infrastructure
    const roomInfo = this._rooms.get(roomId);
    if (roomInfo) {
      // Close all participants' media resources
      roomInfo.participants.forEach((participant) => {
        participant.producers.forEach((producer) => producer.close());
        participant.consumers.forEach((consumer) => consumer.close());
        participant.transports.forEach((transport) => transport.close());
      });

      // Close router
      if (roomInfo.router) {
        roomInfo.router.close();
      }

      // Close protoo room
      if (roomInfo.protooRoom) {
        roomInfo.protooRoom.close();
      }

      this._rooms.delete(roomId);
    }

    // Close mediasoup router
    await this._mediasoupService.closeRouter(roomId);

    logger.info(`Room ${roomId} closed`);
  }

  getRoomParticipants(roomId: string): string[] {
    const roomInfo = this._rooms.get(roomId);
    return roomInfo ? Array.from(roomInfo.participants.keys()) : [];
  }

  getRouter(roomId: string): MediasoupTypes.Router | null {
    const roomInfo = this._rooms.get(roomId);
    return roomInfo?.router || null;
  }

  getProtooRoom(roomId: string): protoo.Room | null {
    const roomInfo = this._rooms.get(roomId);
    return roomInfo?.protooRoom || null;
  }

  getInfrastructureParticipant(
    roomId: string,
    peerId: string,
  ): InfrastructureParticipantInterface | null {
    const roomInfo = this._rooms.get(roomId);
    return roomInfo?.participants.get(peerId) || null;
  }

  setInfrastructureParticipant(
    roomId: string,
    peerId: string,
    participant: InfrastructureParticipantInterface,
  ): void {
    const roomInfo = this._rooms.get(roomId);
    if (roomInfo) {
      roomInfo.participants.set(peerId, participant);
    }
  }

  removeInfrastructureParticipant(roomId: string, peerId: string): void {
    const roomInfo = this._rooms.get(roomId);
    if (roomInfo) {
      roomInfo.participants.delete(peerId);
    }
  }
}
