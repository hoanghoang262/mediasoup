import * as protoo from 'protoo-server';

import { ProtooBroadcastManagerInterface } from './types';
import { logger } from '../../config/logger';
import { roomManager } from '../room/RoomManager';

export class ProtooBroadcastManager implements ProtooBroadcastManagerInterface {
  private readonly _protooRooms: Map<string, protoo.Room> = new Map();

  public addRoom(roomId: string, room: protoo.Room): void {
    this._protooRooms.set(roomId, room);
  }

  /**
   * Notify all peers in a room about an event
   */
  public broadcastToRoom(
    roomId: string,
    method: string,
    data: Record<string, unknown>,
    excludePeerId?: string,
  ): void {
    const room = roomManager.getRoom(roomId);
    if (!room) {
      logger.warn(`Cannot broadcast to non-existent room: ${roomId}`);
      return;
    }

    const peers = room.protooRoom.peers.filter(
      (peer) => peer.id !== excludePeerId,
    );

    logger.debug(`Broadcasting ${method} to ${peers.length} peers`, {
      roomId,
      method,
      excludePeerId,
      peerCount: peers.length,
    });

    for (const peer of peers) {
      void peer.notify(method, data).catch((error) => {
        logger.error(`Failed to notify peer ${peer.id}:`, error);
      });
    }
  }

  public removeRoom(roomId: string): void {
    this._protooRooms.delete(roomId);
  }

  /**
   * Notifies a new peer about all existing producers so they can consume them
   */
  public async createConsumersForNewPeer(
    roomId: string,
    peerId: string,
  ): Promise<void> {
    try {
      const room = roomManager.getRoom(roomId);
      if (!room) {
        logger.error(
          `Room ${roomId} not found when creating consumers for new peer`,
        );
        return;
      }

      // Get the protoo peer
      let peer: protoo.Peer;
      try {
        peer = room.protooRoom.getPeer(peerId);
      } catch (error) {
        logger.error(
          `Error getting peer ${peerId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        return;
      }

      logger.info(
        `Creating consumers for new peer ${peerId} in room ${roomId}`,
      );

      // Process all participants in the room (except the new peer)
      for (const [participantId, participant] of room.participants.entries()) {
        // Skip if this is the new peer
        if (participantId === peerId) continue;

        logger.debug(
          `Checking for producers from participant ${participantId}`,
        );

        // Process all producers from this participant
        for (const [producerId, producer] of participant.producers.entries()) {
          try {
            const producerKind = producer.kind;
            const producerRtpParameters = producer.rtpParameters;
            const appData = producer.appData;

            logger.info(
              `Found producer ${producerId} (kind: ${producerKind}) from participant ${participantId}`,
            );

            // Notify the new peer about this producer so they can consume it
            await peer.notify('newConsumer', {
              peerId: participantId,
              producerId: producerId,
              consumerId: `${producerId}-${peerId}`, // Generate a unique consumer ID
              kind: producerKind,
              rtpParameters: producerRtpParameters,
              appData: appData,
            });

            logger.info(
              `Successfully notified peer ${peerId} about producer ${producerId} from peer ${participantId}`,
            );
          } catch (error) {
            logger.error(
              `Failed to notify peer ${peerId} about producer ${producerId}:`,
              error,
            );
          }
        }
      }

      logger.info(
        `Finished creating consumers for new peer ${peerId} in room ${roomId}`,
      );
    } catch (error) {
      logger.error(`Error creating consumers for new peer ${peerId}:`, error);
    }
  }
}

export const protooBroadcastManager = new ProtooBroadcastManager();
