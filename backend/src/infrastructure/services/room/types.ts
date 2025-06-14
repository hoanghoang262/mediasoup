import { types as MediasoupTypes } from 'mediasoup';
import { Peer, Room as ProtooRoom } from 'protoo-server';

export interface InfrastructureParticipantInterface {
  id: string;
  peer: Peer;
  transports: Map<string, MediasoupTypes.WebRtcTransport>;
  producers: Map<string, MediasoupTypes.Producer>;
  consumers: Map<string, MediasoupTypes.Consumer>;
  joinedAt: Date;
}

export interface RoomMediaInfoInterface {
  participants: Map<string, InfrastructureParticipantInterface>;
  router: MediasoupTypes.Router | null;
  protooRoom: ProtooRoom | null;
}
