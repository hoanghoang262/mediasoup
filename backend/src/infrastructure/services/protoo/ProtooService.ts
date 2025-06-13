import { Server } from 'http';
import * as protoo from 'protoo-server';
import type { types as mediasoupTypes } from 'mediasoup';

import { mediasoupConfig } from '../../config/mediasoup';

import { RoomServiceInterface } from '../../../domain/services/RoomServiceInterface';
import { ProtooServiceInterface } from '../../../domain/services/ProtooServiceInterface';
import { logger } from '../../config/logger';

export interface PeerMediaInfo {
  peer: protoo.Peer;
  transports: Map<string, mediasoupTypes.WebRtcTransport>;
  producers: Map<string, mediasoupTypes.Producer>;
  consumers: Map<string, mediasoupTypes.Consumer>;
}

export class ProtooService implements ProtooServiceInterface {
  private _webSocketServer: protoo.WebSocketServer | null = null;
  private readonly _peers: Map<string, Map<string, PeerMediaInfo>> = new Map();

  constructor(private readonly _roomService: RoomServiceInterface) {}

  public initialize(httpServer: Server): void {
    this._webSocketServer = new protoo.WebSocketServer(httpServer);
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
    const url = new URL(info.request.url || '', 'http://localhost');
    const roomId = url.searchParams.get('roomId');
    const peerId = url.searchParams.get('peerId');

    if (!roomId || !peerId) {
      reject(400, 'roomId and peerId are required');
      return;
    }

    const transport = accept();
    const peer = new protoo.Peer(transport);

    let roomPeers = this._peers.get(roomId);
    if (!roomPeers) {
      roomPeers = new Map();
      this._peers.set(roomId, roomPeers);
    }

    const peerInfo: PeerMediaInfo = {
      peer,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
    };

    roomPeers.set(peerId, peerInfo);

    await this._roomService.addParticipant(roomId, peerId);
    this.broadcast(roomId, 'participantJoined', { peerId }, peerId);

    peer.on('request', (request, acceptRequest, rejectRequest) => {
      void this.handleRequest(
        roomId,
        peerId,
        request,
        acceptRequest,
        rejectRequest,
      );
    });

    peer.on('close', () => {
      roomPeers?.delete(peerId);
      void this._roomService.removeParticipant(roomId, peerId);
      this.broadcast(roomId, 'participantLeft', { peerId }, peerId);
    });
  }

  private broadcast(
    roomId: string,
    method: string,
    data: Record<string, unknown>,
    excludePeerId?: string,
  ): void {
    const roomPeers = this._peers.get(roomId);
    if (!roomPeers) return;

    for (const [id, info] of roomPeers.entries()) {
      if (id === excludePeerId) continue;
      info.peer
        .notify(method, data)
        .catch((error) => logger.warn(`Failed to notify peer ${id}`, error));
    }
  }

  private async handleRequest(
    roomId: string,
    peerId: string,
    request: protoo.Request,
    accept: (data?: Record<string, unknown>) => void,
    reject: (error?: Error) => void,
  ): Promise<void> {
    const roomPeers = this._peers.get(roomId);
    const peerInfo = roomPeers?.get(peerId);

    if (!peerInfo) {
      reject(new Error('peer not found'));
      return;
    }

    try {
      switch (request.method) {
        case 'ping':
          accept({ pong: true });
          break;
        case 'getRouterRtpCapabilities': {
          await this._roomService.getOrCreateRoom(roomId);
          const router = this._roomService.getRouter(roomId);
          if (!router) throw new Error('router not found');
          const internal = router.internal as mediasoupTypes.Router;
          accept({ rtpCapabilities: internal.rtpCapabilities });
          break;
        }
        case 'createWebRtcTransport': {
          const router = this._roomService.getRouter(roomId);
          if (!router) throw new Error('router not found');
          const internal = router.internal as mediasoupTypes.Router;
          const transport = await internal.createWebRtcTransport({
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

          peerInfo.transports.set(transport.id, transport);

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
          const transport = peerInfo.transports.get(String(transportId));
          if (!transport) throw new Error('transport not found');
          await transport.connect({ dtlsParameters: dtlsParameters as mediasoupTypes.DtlsParameters });
          accept({ success: true });
          break;
        }
        case 'produce': {
          const { transportId, kind, rtpParameters, appData } = request.data || {};
          if (!transportId || !kind || !rtpParameters) {
            throw new Error('missing data');
          }
          const transport = peerInfo.transports.get(String(transportId));
          if (!transport) throw new Error('transport not found');
          const producer = await transport.produce({
            kind: kind as mediasoupTypes.MediaKind,
            rtpParameters: rtpParameters as mediasoupTypes.RtpParameters,
            appData: appData as mediasoupTypes.AppData,
          });
          peerInfo.producers.set(producer.id, producer);

          if (appData && (appData as Record<string, unknown>).mediaType === 'screen') {
            this.broadcast(roomId, 'screenSharingStarted', { peerId, producerId: producer.id }, peerId);
          }

          accept({ id: producer.id });
          break;
        }
        case 'consume': {
          const { transportId, producerId, rtpCapabilities } = request.data || {};
          if (!transportId || !producerId || !rtpCapabilities) {
            throw new Error('missing data');
          }
          const router = this._roomService.getRouter(roomId);
          if (!router) throw new Error('router not found');
          const internal = router.internal as mediasoupTypes.Router;
          if (!internal.canConsume({ producerId: String(producerId), rtpCapabilities: rtpCapabilities as mediasoupTypes.RtpCapabilities })) {
            throw new Error('cannot consume');
          }
          const transport = peerInfo.transports.get(String(transportId));
          if (!transport) throw new Error('transport not found');
          const consumer = await transport.consume({
            producerId: String(producerId),
            rtpCapabilities: rtpCapabilities as mediasoupTypes.RtpCapabilities,
            paused: true,
          });
          peerInfo.consumers.set(consumer.id, consumer);
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
          const consumer = peerInfo.consumers.get(String(consumerId));
          if (!consumer) throw new Error('consumer not found');
          await consumer.resume();
          accept({ success: true });
          break;
        }
        case 'getParticipants': {
          const participants = await this._roomService.getRoomParticipants(roomId);
          accept({ participants });
          break;
        }
        case 'closeProducer': {
          const { producerId } = request.data || {};
          if (!producerId) throw new Error('missing producerId');
          const producer = peerInfo.producers.get(String(producerId));
          if (producer) {
            const isScreen = (producer.appData as Record<string, unknown> | undefined)?.mediaType === 'screen';
            producer.close();
            peerInfo.producers.delete(String(producerId));
            if (isScreen) {
              this.broadcast(roomId, 'screenSharingStopped', { peerId, producerId: String(producerId) }, peerId);
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
