import { Room } from '../../../domain/entities/Room';
import { RoomRepositoryInterface } from '../../../domain/repositories/RoomRepository';
import {
  MediasoupServiceInterface,
  RouterInterface,
} from '../../../domain/services/MediasoupServiceInterface';
import { RoomServiceInterface } from '../../../domain/services/RoomServiceInterface';
import { logger } from '../../config/logger';

export class RoomService implements RoomServiceInterface {
  constructor(
    private readonly _roomRepository: RoomRepositoryInterface,
    private readonly _mediasoupService: MediasoupServiceInterface,
  ) {}

  public async createRoom(roomId: string): Promise<Room> {
    // Check if room already exists
    const existingRoom = await this._roomRepository.findById(roomId);
    if (existingRoom) {
      return existingRoom;
    }

    // Create a new room
    const room = Room.create(roomId);

    // Create a router for the room
    try {
      const router = await this._mediasoupService.createRouter(roomId);
      room.routerId = router.id;
    } catch (error) {
      logger.error(`Failed to create router for room ${roomId}:`, error);
      throw new Error(`Failed to create router for room ${roomId}`);
    }

    // Save the room
    await this._roomRepository.save(room);

    return room;
  }

  public async getOrCreateRoom(roomId: string): Promise<Room> {
    // Check if room already exists
    const existingRoom = await this._roomRepository.findById(roomId);
    if (existingRoom) {
      return existingRoom;
    }

    // Create a new room
    return this.createRoom(roomId);
  }

  public getRouter(roomId: string): RouterInterface | null {
    return this._mediasoupService.getRouter(roomId);
  }

  public async addParticipant(roomId: string, peerId: string): Promise<void> {
    const room = await this.getOrCreateRoom(roomId);
    room.addParticipant(peerId);
    await this._roomRepository.save(room);
    logger.info(`Participant ${peerId} added to room ${roomId}`);
  }

  public async removeParticipant(
    roomId: string,
    peerId: string,
  ): Promise<void> {
    const room = await this._roomRepository.findById(roomId);

    if (!room) {
      logger.warn(
        `Tried to remove participant ${peerId} from non-existent room ${roomId}`,
      );
      return;
    }

    room.removeParticipant(peerId);

    // Check if room is empty
    if (room.isEmpty()) {
      await this.closeRoom(roomId);
      logger.info(`Room ${roomId} closed as it's empty`);
    } else {
      await this._roomRepository.save(room);
      logger.info(`Participant ${peerId} removed from room ${roomId}`);
    }
  }

  public async closeRoom(roomId: string): Promise<void> {
    // Close the router
    await this._mediasoupService.closeRouter(roomId);

    // Delete the room
    await this._roomRepository.delete(roomId);
    logger.info(`Room ${roomId} closed`);
  }

  public async getRoomParticipants(roomId: string): Promise<string[]> {
    const room = await this._roomRepository.findById(roomId);
    return room ? room.participants : [];
  }
}
