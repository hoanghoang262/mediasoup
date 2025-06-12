import { types as MediasoupTypes } from 'mediasoup';
import * as protoo from 'protoo-server';

export interface ProtooRequestInterface {
  method: string;
  data?: Record<string, unknown>;
}

export interface TransportInterface {
  id: string;
  peerId: string;
  transport: MediasoupTypes.WebRtcTransport;
}

export interface ProducerInterface {
  id: string;
  peerId: string;
  producer: MediasoupTypes.Producer;
}

export interface ConsumerInterface {
  id: string;
  peerId: string;
  consumer: MediasoupTypes.Consumer;
}

export interface ParticipantInterface {
  id: string;
  displayName?: string;
  device?: Record<string, unknown>;
  transports: Map<string, TransportInterface>;
  producers: Map<string, ProducerInterface>;
  consumers: Map<string, ConsumerInterface>;
  joinedAt: number;
}

export interface ProtooRequestHandlerInterface {
  handleRequest(
    peer: protoo.Peer,
    request: ProtooRequestInterface,
    accept: (data?: Record<string, unknown>) => void,
    reject: (error?: Error) => void,
    roomId: string,
  ): Promise<void>;
}

export interface ProtooBroadcastManagerInterface {
  broadcastToRoom(
    roomId: string,
    method: string,
    data: Record<string, unknown>,
    excludePeerId?: string,
  ): void;
}
