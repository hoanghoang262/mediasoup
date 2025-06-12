import { Server } from 'node:http';

import * as protoo from 'protoo-server';

import { protooBroadcastManager } from './ProtooBroadcastManager';
import { protooRequestHandler } from './ProtooRequestHandler';
import { logger } from '../../config/logger';
import { protooConfig } from '../../config/protoo';
import { roomManager } from '../room/RoomManager';

export class ProtooService {
  private _protooWebSocketServer: protoo.WebSocketServer | null = null;
  private _pingIntervals: Map<string, NodeJS.Timeout> = new Map();

  public initialize(httpServer: Server): void {
    logger.info('🔌 Initializing Protoo WebSocket server...');

    try {
      // Create the protoo WebSocket server
      this._protooWebSocketServer = new protoo.WebSocketServer(httpServer, {
        maxReceivedFrameSize: protooConfig.maxReceivedFrameSize,
        maxReceivedMessageSize: protooConfig.maxReceivedMessageSize,
        fragmentOutgoingMessages: protooConfig.fragmentOutgoingMessages,
        fragmentationThreshold: protooConfig.fragmentationThreshold,
      });

      // Handle connections from clients
      this._protooWebSocketServer.on(
        'connectionrequest',
        (
          info: protoo.ConnectionRequestInfo,
          accept: protoo.ConnectionRequestAcceptFn,
          reject: protoo.ConnectionRequestRejectFn,
        ) => {
          // Handle the async function properly by not returning the Promise
          void this.handleConnectionRequest(info, accept, reject);
        },
      );

      logger.info('✅ Protoo WebSocket server initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Protoo WebSocket server:', error);
      throw error;
    }
  }

  private async handleConnectionRequest(
    info: protoo.ConnectionRequestInfo,
    accept: protoo.ConnectionRequestAcceptFn,
    reject: protoo.ConnectionRequestRejectFn,
  ): Promise<void> {
    try {
      // Parse URL to get roomId and peerId
      const reqUrl = new URL(info.request.url || '', 'http://localhost');
      const roomId = reqUrl.searchParams.get('roomId');
      const peerId = reqUrl.searchParams.get('peerId');

      // Validate required parameters
      if (!roomId || !peerId) {
        logger.warn('Connection request without roomId and/or peerId');
        reject(400, 'Connection request without roomId and/or peerId');
        return;
      }

      logger.info('📥 Protoo connection request', {
        roomId,
        peerId,
        address: info.socket.remoteAddress,
        origin: info.origin,
      });

      // Accept the protoo WebSocket connection
      const protooWebSocketTransport = accept();

      // Get or create unified room (includes both MediaSoup router and Protoo room)
      const room = await roomManager.getOrCreateRoom(roomId);

      // Check if peer already exists
      if (room.protooRoom.hasPeer(peerId)) {
        const existingPeer = room.protooRoom.getPeer(peerId);
        logger.warn(
          `Peer ${peerId} already exists, closing existing connection`,
        );
        existingPeer.close();

        // Clean up any existing ping interval for this peer
        this.cleanupPingInterval(`${roomId}:${peerId}`);
      }

      // Create new peer in the room's protooRoom
      const peer = room.protooRoom.createPeer(peerId, protooWebSocketTransport);

      logger.debug(
        `👤 Peer created successfully [roomId:${roomId}, peerId:${peerId}]`,
        {
          roomId,
          peerId,
          roomPeerCount: room.protooRoom.peers.length,
        },
      );

      // Set up peer event handlers IMMEDIATELY and SYNCHRONOUSLY
      logger.debug('🔧 Setting up handlers for peer', { peerId, roomId });

      // Handle protoo requests
      peer.on('request', (request, accept, reject) => {
        logger.info(`📨 REQUEST RECEIVED: ${request.method}`, {
          peerId,
          roomId,
          method: request.method,
        });

        void protooRequestHandler
          .handleRequest(peer, request, accept, reject, roomId)
          .catch((error) => {
            logger.error('Request handler error:', error);
            reject(new Error('Internal server error'));
          });
      });

      // Handle peer close
      peer.on('close', () => {
        logger.debug(`Protoo peer closed [peerId:${peer.id}]`);
        // Clean up ping interval
        this.cleanupPingInterval(`${roomId}:${peer.id}`);
        void this.removeParticipant(roomId, peer.id);
      });

      // Add participant to room
      try {
        roomManager.addParticipant(roomId, peer.id);
      } catch (error) {
        logger.error('Failed to add participant:', error);
        peer.close();
        return;
      }

      // Notify all peers in the room about the new participant
      this.broadcastToRoom(roomId, 'participantJoined', { peerId }, peerId);

      // Create consumers for existing producers
      await protooBroadcastManager.createConsumersForNewPeer(roomId, peer.id);

      // Start ping interval for this peer
      this.startPingInterval(roomId, peer);

      logger.info(
        `✅ Protoo connection established [roomId:${roomId}, peerId:${peerId}]`,
      );
    } catch (error) {
      logger.error('❌ Protoo connection failed:', error);
      reject(500, 'Internal server error');
    }
  }

  private startPingInterval(roomId: string, peer: protoo.Peer): void {
    const pingKey = `${roomId}:${peer.id}`;

    // Clean up any existing interval first
    this.cleanupPingInterval(pingKey);

    // Create a new ping interval
    const interval = setInterval(() => {
      // Check if the peer is still in the room
      const room = roomManager.getRoom(roomId);
      if (!room || !room.protooRoom.hasPeer(peer.id)) {
        logger.debug(
          `Peer ${peer.id} no longer in room, stopping ping interval`,
        );
        this.cleanupPingInterval(pingKey);
        return;
      }

      // Send a notification ping that doesn't require a response
      // This keeps the WebSocket connection alive
      peer.notify('ping', { timestamp: Date.now() }).catch((error) => {
        logger.warn(`Failed to send ping to peer ${peer.id}:`, error);
        // No need to do anything, the WebSocket will close if there's a real issue
      });
    }, protooConfig.pingInterval);

    // Store the interval for later cleanup
    this._pingIntervals.set(pingKey, interval);
  }

  private cleanupPingInterval(key: string): void {
    const interval = this._pingIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this._pingIntervals.delete(key);
    }
  }

  private async removeParticipant(
    roomId: string,
    peerId: string,
  ): Promise<void> {
    try {
      roomManager.removeParticipant(roomId, peerId);

      // Notify all peers in the room about the participant leaving
      this.broadcastToRoom(roomId, 'participantLeft', { peerId });
    } catch (error) {
      logger.error('Failed to remove participant:', error);
    }
  }

  private broadcastToRoom(
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
      peer.notify(method, data).catch((error) => {
        logger.error(`Failed to notify peer ${peer.id}:`, error);
      });
    }
  }
}

export const protooService = new ProtooService();
