import { types as MediasoupTypes } from 'mediasoup';

import { TransportInterface, ConsumerInterface } from './types';
import { logger } from '../../config/logger';
import { roomManager } from '../room/RoomManager';
import { RoomInterface } from '../room/types';

export class MediaStreamManager {
  public addTransport(
    peerId: string,
    transport: MediasoupTypes.WebRtcTransport,
  ): void {
    // Find the room containing this peer
    const room = this.findRoomByPeerId(peerId);
    if (!room) {
      throw new Error(`No room found for peer ${peerId}`);
    }

    const participant = room.participants.get(peerId);
    if (!participant) {
      throw new Error(`Participant ${peerId} not found in room ${room.id}`);
    }

    // Add transport to participant
    participant.transports.set(transport.id, transport);

    logger.debug(`Transport added [${transport.id}]`, {
      peerId,
      roomId: room.id,
      transportId: transport.id,
    });
  }

  public getTransport(peerId: string, transportId: string): TransportInterface {
    const room = this.findRoomByPeerId(peerId);
    if (!room) {
      throw new Error(`No room found for peer ${peerId}`);
    }

    const participant = room.participants.get(peerId);
    if (!participant) {
      throw new Error(`Participant ${peerId} not found in room ${room.id}`);
    }

    const transport = participant.transports.get(transportId);
    if (!transport) {
      throw new Error(`Transport ${transportId} not found for peer ${peerId}`);
    }

    return {
      id: transportId,
      peerId,
      transport,
    };
  }

  public async addProducer(
    peerId: string,
    transportId: string,
    producer: MediasoupTypes.Producer,
  ): Promise<void> {
    const room = this.findRoomByPeerId(peerId);
    if (!room) {
      throw new Error(`No room found for peer ${peerId}`);
    }

    const participant = room.participants.get(peerId);
    if (!participant) {
      throw new Error(`Participant ${peerId} not found in room ${room.id}`);
    }

    // Add producer to participant
    participant.producers.set(producer.id, producer);

    // Set up producer event handlers
    producer.on('transportclose', () => {
      logger.debug(`Producer transport closed [${producer.id}]`);
      participant.producers.delete(producer.id);
    });

    producer.on('@close', () => {
      logger.debug(`Producer closed [${producer.id}]`);
      participant.producers.delete(producer.id);
    });

    // Get appData from producer
    const appData = producer.appData;
    const isScreenShare = appData.mediaType === 'screen';

    logger.debug(`Producer added [${producer.id}]`, {
      peerId,
      roomId: room.id,
      transportId,
      producerId: producer.id,
      kind: producer.kind,
      isScreenShare,
    });

    // If this is a screen sharing producer, notify all peers in the room
    if (isScreenShare) {
      // Notify all peers (except the producer) about the new screen share
      this.notifyPeersInRoom(room, peerId, 'screenSharingStarted', {
        peerId,
        producerId: producer.id,
      });

      logger.info(
        `Screen sharing started by peer ${peerId} in room ${room.id}`,
      );
    }
  }

  public async addConsumer(
    peerId: string,
    transportId: string,
    consumer: MediasoupTypes.Consumer,
    producerId: string,
  ): Promise<void> {
    const room = this.findRoomByPeerId(peerId);
    if (!room) {
      throw new Error(`No room found for peer ${peerId}`);
    }

    const participant = room.participants.get(peerId);
    if (!participant) {
      throw new Error(`Participant ${peerId} not found in room ${room.id}`);
    }

    // Add consumer to participant
    participant.consumers.set(consumer.id, consumer);

    // Set up consumer event handlers
    consumer.on('transportclose', () => {
      logger.debug(`Consumer transport closed [${consumer.id}]`);
      participant.consumers.delete(consumer.id);
    });

    consumer.on('producerclose', () => {
      logger.debug(`Consumer's producer closed [${consumer.id}]`);
      participant.consumers.delete(consumer.id);

      // Notify the peer that the consumer's producer has been closed
      try {
        const peer = room.protooRoom.getPeer(peerId);
        peer.notify('producerClosed', { producerId }).catch((error: Error) => {
          logger.error(
            `Failed to notify peer ${peerId} about producer close:`,
            error,
          );
        });
      } catch {
        logger.warn(
          `Peer ${peerId} not found, can't notify about producer close`,
        );
      }
    });

    consumer.on('@close', () => {
      logger.debug(`Consumer closed [${consumer.id}]`);
      participant.consumers.delete(consumer.id);
    });

    logger.debug(`Consumer added [${consumer.id}]`, {
      peerId,
      roomId: room.id,
      transportId,
      consumerId: consumer.id,
      producerId,
    });
  }

  public getConsumer(peerId: string, consumerId: string): ConsumerInterface {
    const room = this.findRoomByPeerId(peerId);
    if (!room) {
      throw new Error(`No room found for peer ${peerId}`);
    }

    const participant = room.participants.get(peerId);
    if (!participant) {
      throw new Error(`Participant ${peerId} not found in room ${room.id}`);
    }

    const consumer = participant.consumers.get(consumerId);
    if (!consumer) {
      throw new Error(`Consumer ${consumerId} not found for peer ${peerId}`);
    }

    return {
      id: consumerId,
      peerId,
      consumer,
    };
  }

  public async closeProducer(
    peerId: string,
    producerId: string,
  ): Promise<void> {
    const room = this.findRoomByPeerId(peerId);
    if (!room) {
      throw new Error(`No room found for peer ${peerId}`);
    }

    const participant = room.participants.get(peerId);
    if (!participant) {
      throw new Error(`Participant ${peerId} not found in room ${room.id}`);
    }

    const producer = participant.producers.get(producerId);
    if (!producer) {
      throw new Error(`Producer ${producerId} not found for peer ${peerId}`);
    }

    // Check if this is a screen sharing producer
    const appData = producer.appData;
    const isScreenShare = appData.mediaType === 'screen';

    // Close the producer
    producer.close();
    participant.producers.delete(producerId);

    logger.debug(`Producer closed [${producerId}]`, {
      peerId,
      roomId: room.id,
      producerId,
    });

    // If this was a screen sharing producer, notify all peers in the room
    if (isScreenShare) {
      // Notify all peers (except the producer) about the screen share ending
      this.notifyPeersInRoom(room, peerId, 'screenSharingStopped', {
        peerId,
        producerId,
      });

      logger.info(
        `Screen sharing stopped by peer ${peerId} in room ${room.id}`,
      );
    }
  }

  private findRoomByPeerId(peerId: string): RoomInterface | undefined {
    // Get all rooms directly from the roomManager
    const rooms = roomManager.getAllRooms();

    for (const roomInfo of rooms) {
      const room = roomManager.getRoom(roomInfo.id);
      if (room && room.participants.has(peerId)) {
        return room;
      }
    }

    return undefined;
  }

  /**
   * Notify all peers in a room except the sender
   */
  private notifyPeersInRoom(
    room: RoomInterface,
    senderPeerId: string,
    method: string,
    data: Record<string, unknown>,
  ): void {
    for (const receiverPeerId of room.participants.keys()) {
      // Skip the sender
      if (receiverPeerId === senderPeerId) continue;

      try {
        const peer = room.protooRoom.getPeer(receiverPeerId);
        peer.notify(method, data).catch((error) => {
          logger.error(`Failed to notify peer ${receiverPeerId}:`, error);
        });
      } catch {
        logger.warn(`Peer ${receiverPeerId} not found, can't notify`);
      }
    }
  }
}

export const mediaStreamManager = new MediaStreamManager();
