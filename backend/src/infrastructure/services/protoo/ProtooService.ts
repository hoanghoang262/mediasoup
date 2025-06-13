import { Server } from 'http';
import * as protoo from 'protoo-server';

import { RoomServiceInterface } from '../../../domain/services/RoomServiceInterface';
import { ProtooServiceInterface } from '../../../domain/services/ProtooServiceInterface';
import { logger } from '../../config/logger';

export class ProtooService implements ProtooServiceInterface {
  private _webSocketServer: protoo.WebSocketServer | null = null;
  private readonly _peers: Map<string, Map<string, protoo.Peer>> = new Map();

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
    const peer = new protoo.Peer(transport); // using direct Peer creation not recommended but we can use protoo default

    let roomPeers = this._peers.get(roomId);
    if (!roomPeers) {
      roomPeers = new Map();
      this._peers.set(roomId, roomPeers);
    }
    roomPeers.set(peerId, peer);

    await this._roomService.addParticipant(roomId, peerId);
    this.broadcast(roomId, 'participantJoined', { peerId }, peerId);

    peer.on('request', (request, acceptRequest, rejectRequest) => {
      if (request.method === 'ping') {
        acceptRequest({ pong: true });
      } else {
        rejectRequest(new Error('unknown method'));
      }
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

    for (const [id, peer] of roomPeers.entries()) {
      if (id === excludePeerId) continue;
      peer
        .notify(method, data)
        .catch((error) => logger.warn(`Failed to notify peer ${id}`, error));
    }
  }
}
