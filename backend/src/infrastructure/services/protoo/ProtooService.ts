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
    logger.info('Initializing Protoo WebSocket server...');

    this._webSocketServer = new protoo.WebSocketServer(httpServer, {
      maxReceivedFrameSize: protooConfig.maxReceivedFrameSize,
      maxReceivedMessageSize: protooConfig.maxReceivedMessageSize,
      fragmentOutgoingMessages: protooConfig.fragmentOutgoingMessages,
      fragmentationThreshold: protooConfig.fragmentationThreshold,
    });

    logger.info(
      'Protoo WebSocket server created, setting up event handlers...',
    );

    this._webSocketServer.on(
      'connectionrequest',
      (
        info: protoo.ConnectionRequestInfo,
        accept: protoo.ConnectionRequestAcceptFn,
        reject: protoo.ConnectionRequestRejectFn,
      ) => {
        logger.info('Protoo WebSocket connectionrequest event received');
        void this.handleConnection(info, accept, reject);
      },
    );

    // Note: protoo WebSocketServer may not have an 'error' event
    // We'll rely on the connection-level error handling instead

    logger.info('Protoo WebSocket server initialized with event handlers');
  }

  private async handleConnection(
    info: protoo.ConnectionRequestInfo,
    accept: protoo.ConnectionRequestAcceptFn,
    reject: protoo.ConnectionRequestRejectFn,
  ): Promise<void> {
    logger.info(`WebSocket connection request received: ${info.request.url}`);

    if (!info.request.url) {
      logger.error('WebSocket connection rejected: url is required');
      reject(400, 'url is required');
      return;
    }

    // Extract query string from URL (handles both full URLs and relative paths)
    const queryStart = info.request.url.indexOf('?');
    if (queryStart === -1) {
      logger.error(
        'WebSocket connection rejected: query parameters are required',
      );
      reject(400, 'query parameters are required');
      return;
    }

    const queryString = info.request.url.substring(queryStart + 1);
    const searchParams = new URLSearchParams(queryString);
    const roomId = searchParams.get('roomId');
    const peerId = searchParams.get('peerId');

    logger.info(
      `WebSocket connection params: roomId=${roomId}, peerId=${peerId}`,
    );

    if (!roomId || !peerId) {
      logger.error(
        'WebSocket connection rejected: roomId and peerId are required',
      );
      reject(400, 'roomId and peerId are required');
      return;
    }

    const transport = accept();
    logger.info(
      `WebSocket connection accepted for roomId=${roomId}, peerId=${peerId}`,
    );

    // Get or create room and protoo room
    await this._roomManager.getOrCreateRoom(roomId);
    const protooRoom = this._roomManager.getProtooRoom(roomId);

    if (!protooRoom) {
      logger.error(`Failed to create protoo room for roomId=${roomId}`);
      reject(500, 'Failed to create protoo room');
      return;
    }

    const peer = protooRoom.createPeer(peerId, transport);
    logger.info(`Protoo peer created for roomId=${roomId}, peerId=${peerId}`);

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

    // Notify existing participants about the new participant
    this.broadcast(roomId, 'participantJoined', { peerId }, peerId);

    // Notify the new participant about existing producers in the room
    await this.notifyExistingProducers(roomId, peerId);

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

  private async notifyExistingProducers(
    roomId: string,
    newPeerId: string,
  ): Promise<void> {
    const newParticipant = this._roomManager.getInfrastructureParticipant(
      roomId,
      newPeerId,
    );
    if (!newParticipant) {
      logger.error(
        `New participant ${newPeerId} not found when notifying about existing producers`,
      );
      return;
    }

    // Get all participants in the room except the new one
    const allParticipants = this._roomManager.getRoomParticipants(roomId);

    for (const participantId of allParticipants) {
      if (participantId === newPeerId) continue; // Skip the new participant

      const participant = this._roomManager.getInfrastructureParticipant(
        roomId,
        participantId,
      );
      if (!participant) continue;

      // Notify the new participant about each existing producer
      for (const [producerId, producer] of participant.producers) {
        try {
          await newParticipant.peer.notify('newConsumer', {
            peerId: participantId,
            producerId: producerId,
            kind: producer.kind,
            rtpParameters: producer.rtpParameters,
            type: 'simple',
            appData: producer.appData,
            producerPaused: producer.paused,
          });

          logger.info(
            `Notified new participant ${newPeerId} about existing producer ${producerId} from ${participantId}`,
          );
        } catch (error) {
          logger.error(
            `Failed to notify new participant ${newPeerId} about producer ${producerId}:`,
            error,
          );
        }
      }
    }
  }

  private async notifyNewProducer(
    roomId: string,
    producerPeerId: string,
    producer: mediasoupTypes.Producer,
  ): Promise<void> {
    // Get all participants in the room except the producer
    const allParticipants = this._roomManager.getRoomParticipants(roomId);

    for (const participantId of allParticipants) {
      if (participantId === producerPeerId) continue; // Skip the producer

      const participant = this._roomManager.getInfrastructureParticipant(
        roomId,
        participantId,
      );
      if (!participant) continue;

      try {
        await participant.peer.notify('newConsumer', {
          peerId: producerPeerId,
          producerId: producer.id,
          kind: producer.kind,
          rtpParameters: producer.rtpParameters,
          type: 'simple',
          appData: producer.appData,
          producerPaused: producer.paused,
        });

        logger.info(
          `Notified participant ${participantId} about new producer ${producer.id} from ${producerPeerId}`,
        );
      } catch (error) {
        logger.error(
          `Failed to notify participant ${participantId} about new producer ${producer.id}:`,
          error,
        );
      }
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
        case 'join': {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { displayName, device, rtpCapabilities, sctpCapabilities } =
            request.data || {};

          // Store participant capabilities (you may want to extend InfrastructureParticipantInterface)
          // For now, just mark as joined and get existing peers
          const existingParticipants =
            this._roomManager.getRoomParticipants(roomId);
          const peers = existingParticipants
            .filter((pId) => pId !== peerId)
            .map((pId) => ({
              id: pId,
              displayName: `User ${pId.substring(0, 5)}`, // You can improve this
            }));

          logger.info(
            `Peer ${peerId} joined room ${roomId}, existing peers:`,
            peers,
          );

          // Return existing peers to the new participant
          accept({ peers });

          // For now, skip automatic consumer creation as it should happen via newConsumer notifications
          // TODO: Create consumers for existing producers like the demo

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

          // Notify all other participants about the new producer
          await this.notifyNewProducer(roomId, peerId, producer);

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
