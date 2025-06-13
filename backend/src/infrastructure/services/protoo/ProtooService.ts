import { Server } from 'http';

import * as protoo from 'protoo-server';

import { ProtooServiceInterface } from '../../../domain/services/ProtooServiceInterface';
import { logger } from '../../../shared/config/logger';
import { mediasoupConfig } from '../../../shared/config/mediasoup';
import { protooConfig } from '../../../shared/config/protoo';
import { RoomManager } from '../room/RoomManager';
import { InfrastructureParticipantInterface } from '../room/types';

import type { types as mediasoupTypes } from 'mediasoup';

export class ProtooService implements ProtooServiceInterface {
  private _webSocketServer: protoo.WebSocketServer | null = null;
  private _pingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(private readonly _roomManager: RoomManager) {}

  public initialize(httpServer: Server): void {
    this._webSocketServer = new protoo.WebSocketServer(httpServer, {
      maxReceivedFrameSize: protooConfig.maxReceivedFrameSize,
      maxReceivedMessageSize: protooConfig.maxReceivedMessageSize,
      fragmentOutgoingMessages: protooConfig.fragmentOutgoingMessages,
      fragmentationThreshold: protooConfig.fragmentationThreshold,
    });
    this._webSocketServer.on(
      'connectionrequest',
      (
        info: protoo.ConnectionRequestInfo,
        accept: protoo.ConnectionRequestAcceptFn,
        reject: protoo.ConnectionRequestRejectFn,
      ) => {
        void this.handleConnection(info, accept, reject);
      },
    );
    logger.info('Protoo WebSocket server initialized');
  }

  private async handleConnection(
    info: protoo.ConnectionRequestInfo,
    accept: protoo.ConnectionRequestAcceptFn,
    reject: protoo.ConnectionRequestRejectFn,
  ): Promise<void> {
    if (!info.request.url) {
      reject(400, 'url is required');
      return;
    }

    // Extract query string from URL (handles both full URLs and relative paths)
    const queryStart = info.request.url.indexOf('?');
    if (queryStart === -1) {
      reject(400, 'query parameters are required');
      return;
    }

    const queryString = info.request.url.substring(queryStart + 1);
    const searchParams = new URLSearchParams(queryString);
    const roomId = searchParams.get('roomId');
    const peerId = searchParams.get('peerId');

    if (!roomId || !peerId) {
      reject(400, 'roomId and peerId are required');
      return;
    }

    const transport = accept();

    // Get or create room and protoo room
    await this._roomManager.getOrCreateRoom(roomId);
    const protooRoom = this._roomManager.getProtooRoom(roomId);

    if (!protooRoom) {
      reject(500, 'Failed to create protoo room');
      return;
    }

    const peer = protooRoom.createPeer(peerId, transport);

    // Create infrastructure participant
    const infrastructureParticipant: InfrastructureParticipantInterface = {
      id: peerId,
      peer,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
      joinedAt: new Date(),
    };

    this._roomManager.setInfrastructureParticipant(
      roomId,
      peerId,
      infrastructureParticipant,
    );
    await this._roomManager.addParticipant(roomId, peerId);
    this.broadcast(roomId, 'participantJoined', { peerId }, peerId);

    // --- PING/PONG KEEPALIVE LOGIC ---
    const pingKey = `${roomId}:${peerId}`;
    this.cleanupPingInterval(pingKey);
    const interval = setInterval(() => {
      // If peer is closed, cleanup
      if (peer.closed) {
        this.cleanupPingInterval(pingKey);
        return;
      }
      peer.notify('ping', { timestamp: Date.now() }).catch((error: unknown) => {
        logger.warn(`Failed to send ping to peer ${peerId}:`, error);
      });
    }, protooConfig.pingInterval);
    this._pingIntervals.set(pingKey, interval);
    // --- END PING/PONG LOGIC ---

    peer.on(
      'request',
      (
        request: protoo.ProtooRequest,
        acceptRequest: (data?: Record<string, unknown>) => void,
        rejectRequest: (error?: Error) => void,
      ) => {
        void this.handleRequest(
          roomId,
          peerId,
          request,
          acceptRequest,
          rejectRequest,
        );
      },
    );

    peer.on('close', () => {
      this._roomManager.removeInfrastructureParticipant(roomId, peerId);
      void this._roomManager.removeParticipant(roomId, peerId);
      this.broadcast(roomId, 'participantLeft', { peerId }, peerId);
      // --- CLEANUP PING INTERVAL ---
      this.cleanupPingInterval(pingKey);
      // --- END CLEANUP ---
    });
  }

  private cleanupPingInterval(key: string): void {
    const interval = this._pingIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this._pingIntervals.delete(key);
    }
  }

  private broadcast(
    roomId: string,
    method: string,
    data: Record<string, unknown>,
    excludePeerId?: string,
  ): void {
    const participants = this._roomManager.getRoomParticipants(roomId);

    for (const participantId of participants) {
      if (participantId === excludePeerId) continue;

      const participant = this._roomManager.getInfrastructureParticipant(
        roomId,
        participantId,
      );
      if (participant) {
        participant.peer
          .notify(method, data)
          .catch((error) =>
            logger.warn(`Failed to notify peer ${participantId}`, error),
          );
      }
    }
  }

  private async handleRequest(
    roomId: string,
    peerId: string,
    request: protoo.ProtooRequest,
    accept: (data?: Record<string, unknown>) => void,
    reject: (error?: Error) => void,
  ): Promise<void> {
    const participant = this._roomManager.getInfrastructureParticipant(
      roomId,
      peerId,
    );

    if (!participant) {
      reject(new Error('participant not found'));
      return;
    }

    try {
      switch (request.method) {
        case 'ping':
          accept({ pong: true });
          break;
        case 'getRouterRtpCapabilities': {
          const router = this._roomManager.getRouter(roomId);
          if (!router) throw new Error('router not found');
          accept({ rtpCapabilities: router.rtpCapabilities });
          break;
        }
        case 'createWebRtcTransport': {
          const router = this._roomManager.getRouter(roomId);
          if (!router) throw new Error('router not found');
          const transport = await router.createWebRtcTransport({
            listenIps: mediasoupConfig.webRtcTransport.listenIps,
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            initialAvailableOutgoingBitrate:
              mediasoupConfig.webRtcTransport.initialAvailableOutgoingBitrate,
            enableSctp: true,
            numSctpStreams: { OS: 1024, MIS: 1024 },
            appData: { peerId },
          });

          participant.transports.set(transport.id, transport);

          accept({
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          });
          break;
        }
        case 'connectWebRtcTransport': {
          const { transportId, dtlsParameters } = request.data || {};
          if (!transportId || !dtlsParameters) {
            throw new Error('missing data');
          }
          const transport = participant.transports.get(String(transportId));
          if (!transport) throw new Error('transport not found');
          await transport.connect({
            dtlsParameters: dtlsParameters as mediasoupTypes.DtlsParameters,
          });
          accept({ success: true });
          break;
        }
        case 'produce': {
          const { transportId, kind, rtpParameters, appData } =
            request.data || {};
          if (!transportId || !kind || !rtpParameters) {
            throw new Error('missing data');
          }
          const transport = participant.transports.get(String(transportId));
          if (!transport) throw new Error('transport not found');
          const producer = await transport.produce({
            kind: kind as mediasoupTypes.MediaKind,
            rtpParameters: rtpParameters as mediasoupTypes.RtpParameters,
            appData: appData as mediasoupTypes.AppData,
          });
          participant.producers.set(producer.id, producer);

          if (
            appData &&
            (appData as Record<string, unknown>).mediaType === 'screen'
          ) {
            this.broadcast(
              roomId,
              'screenSharingStarted',
              { peerId, producerId: producer.id },
              peerId,
            );
          }

          accept({ id: producer.id });
          break;
        }
        case 'consume': {
          const { transportId, producerId, rtpCapabilities } =
            request.data || {};
          if (!transportId || !producerId || !rtpCapabilities) {
            throw new Error('missing data');
          }
          const router = this._roomManager.getRouter(roomId);
          if (!router) throw new Error('router not found');
          if (
            !router.canConsume({
              producerId: String(producerId),
              rtpCapabilities:
                rtpCapabilities as mediasoupTypes.RtpCapabilities,
            })
          ) {
            throw new Error('cannot consume');
          }
          const transport = participant.transports.get(String(transportId));
          if (!transport) throw new Error('transport not found');
          const consumer = await transport.consume({
            producerId: String(producerId),
            rtpCapabilities: rtpCapabilities as mediasoupTypes.RtpCapabilities,
            paused: true,
          });
          participant.consumers.set(consumer.id, consumer);
          accept({
            id: consumer.id,
            producerId: String(producerId),
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
          });
          break;
        }
        case 'resumeConsumer': {
          const { consumerId } = request.data || {};
          if (!consumerId) throw new Error('missing consumerId');
          const consumer = participant.consumers.get(String(consumerId));
          if (!consumer) throw new Error('consumer not found');
          await consumer.resume();
          accept({ success: true });
          break;
        }
        case 'getParticipants': {
          const participants = this._roomManager.getRoomParticipants(roomId);
          accept({ participants });
          break;
        }
        case 'closeProducer': {
          const { producerId } = request.data || {};
          if (!producerId) throw new Error('missing producerId');
          const producer = participant.producers.get(String(producerId));
          if (producer) {
            const isScreen =
              (producer.appData as Record<string, unknown> | undefined)
                ?.mediaType === 'screen';
            producer.close();
            participant.producers.delete(String(producerId));
            if (isScreen) {
              this.broadcast(
                roomId,
                'screenSharingStopped',
                { peerId, producerId: String(producerId) },
                peerId,
              );
            }
          }
          accept({ success: true });
          break;
        }
        default:
          reject(new Error('unknown method'));
      }
    } catch (error) {
      logger.error('protoo request error', error);
      reject(error instanceof Error ? error : new Error('unknown error'));
    }
  }
}
