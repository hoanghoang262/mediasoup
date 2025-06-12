import { types as MediasoupTypes } from 'mediasoup';
import * as protoo from 'protoo-server';

import { mediaStreamManager } from './MediaStreamManager';
import { ProtooRequestInterface, ProtooRequestHandlerInterface } from './types';
import { logger } from '../../config/logger';
import { mediasoupConfig } from '../../config/mediasoup';
import { mediasoupWorkerManager } from '../mediasoup/MediasoupWorkerManager';
import { roomService } from '../room/RoomService';

// Type guard functions
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isDtlsParameters(
  value: unknown,
): value is MediasoupTypes.DtlsParameters {
  return (
    typeof value === 'object' &&
    value !== null &&
    'fingerprints' in value &&
    Array.isArray((value as MediasoupTypes.DtlsParameters).fingerprints)
  );
}

function isMediaKind(value: unknown): value is MediasoupTypes.MediaKind {
  return value === 'audio' || value === 'video';
}

function isRtpParameters(
  value: unknown,
): value is MediasoupTypes.RtpParameters {
  return (
    typeof value === 'object' &&
    value !== null &&
    'codecs' in value &&
    Array.isArray((value as MediasoupTypes.RtpParameters).codecs)
  );
}

function isRtpCapabilities(
  value: unknown,
): value is MediasoupTypes.RtpCapabilities {
  return (
    typeof value === 'object' &&
    value !== null &&
    'codecs' in value &&
    Array.isArray((value as MediasoupTypes.RtpCapabilities).codecs)
  );
}

export class ProtooRequestHandler implements ProtooRequestHandlerInterface {
  public async handleRequest(
    peer: protoo.Peer,
    request: ProtooRequestInterface,
    accept: (data?: Record<string, unknown>) => void,
    reject: (error?: Error) => void,
    roomId: string,
  ): Promise<void> {
    logger.debug(`🔍 Handling protoo request: ${request.method}`, {
      peerId: peer.id,
      roomId,
      method: request.method,
      data: request.data,
    });

    try {
      switch (request.method) {
        case 'ping':
          // Handle ping requests from client
          logger.debug(`Received ping from peer ${peer.id} in room ${roomId}`);
          accept({ pong: true });
          break;

        case 'getRoomParticipants':
          accept({ participants: roomService.getRoomParticipants(roomId) });
          break;

        case 'getRouterRtpCapabilities': {
          const room = await roomService.getOrCreateRoom(roomId);
          const capabilities = room.router.rtpCapabilities;
          logger.debug(
            `✅ Router RTP capabilities retrieved for room ${roomId}`,
            {
              roomId,
              peerId: peer.id,
            },
          );
          accept({ rtpCapabilities: capabilities });
          break;
        }

        case 'createWebRtcTransport': {
          const room = await roomService.getOrCreateRoom(roomId);
          const workerInfo = mediasoupWorkerManager.findWorkerByRoomId(roomId);

          if (!workerInfo?.webRtcServer) {
            throw new Error('WebRTC server not found');
          }

          const transport = await room.router.createWebRtcTransport({
            webRtcServer: workerInfo.webRtcServer,
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            initialAvailableOutgoingBitrate:
              mediasoupConfig.webRtcTransport.initialAvailableOutgoingBitrate,
            maxSctpMessageSize:
              mediasoupConfig.webRtcTransport.maxSctpMessageSize,
            enableSctp: true,
            numSctpStreams: { OS: 1024, MIS: 1024 },
          });

          mediaStreamManager.addTransport(peer.id, transport);

          logger.debug(`✅ WebRTC transport created [${transport.id}]`, {
            roomId,
            peerId: peer.id,
            transportId: transport.id,
          });

          accept({
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          });
          break;
        }

        case 'connectWebRtcTransport': {
          if (!request.data) {
            throw new Error('Missing request data');
          }

          const { transportId, dtlsParameters } = request.data;

          if (!isString(transportId)) {
            throw new Error('Invalid transportId: must be a string');
          }

          if (!isDtlsParameters(dtlsParameters)) {
            throw new Error(
              'Invalid dtlsParameters: missing required properties',
            );
          }

          const transport = mediaStreamManager.getTransport(
            peer.id,
            transportId,
          );

          await transport.transport.connect({
            dtlsParameters,
          });

          logger.debug(`✅ WebRTC transport connected [${transport.id}]`, {
            roomId,
            peerId: peer.id,
            transportId: transport.id,
          });

          accept({ success: true });
          break;
        }

        case 'produce': {
          if (!request.data) {
            throw new Error('Missing request data');
          }

          const { transportId, kind, rtpParameters, appData } = request.data;

          if (!isString(transportId)) {
            throw new Error('Invalid transportId: must be a string');
          }

          if (!isMediaKind(kind)) {
            throw new Error('Invalid kind: must be "audio" or "video"');
          }

          if (!isRtpParameters(rtpParameters)) {
            throw new Error(
              'Invalid rtpParameters: missing required properties',
            );
          }

          const transport = mediaStreamManager.getTransport(
            peer.id,
            transportId,
          );

          const producer = await transport.transport.produce({
            kind,
            rtpParameters,
            appData: appData as MediasoupTypes.AppData,
          });

          await mediaStreamManager.addProducer(peer.id, transport.id, producer);

          const mediaType =
            appData && typeof appData === 'object' && 'mediaType' in appData
              ? appData.mediaType
              : 'regular';

          logger.debug(
            `✅ Producer created [${producer.id}] type: ${mediaType}`,
            {
              roomId,
              peerId: peer.id,
              transportId: transport.id,
              producerId: producer.id,
              kind: producer.kind,
              mediaType,
            },
          );

          accept({ id: producer.id });
          break;
        }

        case 'consume': {
          if (!request.data) {
            throw new Error('Missing request data');
          }

          const { transportId, producerId, rtpCapabilities } = request.data;

          if (!isString(transportId)) {
            throw new Error('Invalid transportId: must be a string');
          }

          if (!isString(producerId)) {
            throw new Error('Invalid producerId: must be a string');
          }

          if (!isRtpCapabilities(rtpCapabilities)) {
            throw new Error(
              'Invalid rtpCapabilities: missing required properties',
            );
          }

          const room = await roomService.getOrCreateRoom(roomId);
          const transport = mediaStreamManager.getTransport(
            peer.id,
            transportId,
          );

          if (
            !room.router.canConsume({
              producerId,
              rtpCapabilities,
            })
          ) {
            throw new Error('Cannot consume this producer');
          }

          const consumer = await transport.transport.consume({
            producerId,
            rtpCapabilities,
            paused: true,
          });

          await mediaStreamManager.addConsumer(
            peer.id,
            transport.id,
            consumer,
            producerId,
          );

          logger.debug(`✅ Consumer created [${consumer.id}]`, {
            roomId,
            peerId: peer.id,
            transportId: transport.id,
            consumerId: consumer.id,
            producerId,
            kind: consumer.kind,
          });

          accept({
            id: consumer.id,
            producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
          });
          break;
        }

        case 'resumeConsumer': {
          if (!request.data?.consumerId || !isString(request.data.consumerId)) {
            throw new Error('Missing or invalid consumerId');
          }

          const consumerId = request.data.consumerId;
          const consumer = mediaStreamManager.getConsumer(peer.id, consumerId);

          await consumer.consumer.resume();

          logger.debug(`✅ Consumer resumed [${consumer.id}]`, {
            roomId,
            peerId: peer.id,
            consumerId: consumer.id,
          });

          accept({ success: true });
          break;
        }

        case 'join': {
          if (!request.data) {
            throw new Error('Missing request data');
          }

          const { displayName, device, rtpCapabilities } = request.data;

          if (!isString(displayName)) {
            throw new Error('Invalid displayName: must be a string');
          }

          if (!isRtpCapabilities(rtpCapabilities)) {
            throw new Error(
              'Invalid rtpCapabilities: missing required properties',
            );
          }

          logger.debug(`✅ Peer ${peer.id} joined room ${roomId}`, {
            roomId,
            peerId: peer.id,
            displayName,
            device,
          });

          // Store additional client info if needed
          // For now we don't store extra participant info
          // Add this functionality later if needed

          accept({ success: true });
          break;
        }

        case 'getParticipants': {
          logger.debug(
            `Peer ${peer.id} requested participants list for room ${roomId}`,
          );

          // Get the list of participants from the room
          const participants = roomService.getRoomParticipants(roomId);

          logger.debug(
            `Returning participants list: ${participants.join(', ')}`,
          );

          // Return the list of participants
          accept({ participants });
          break;
        }

        case 'closeProducer': {
          if (!request.data) {
            throw new Error('Missing request data');
          }

          const { producerId } = request.data;

          if (!isString(producerId)) {
            throw new Error('Invalid producerId: must be a string');
          }

          await mediaStreamManager.closeProducer(peer.id, producerId);

          logger.debug(`✅ Producer closed [${producerId}]`, {
            roomId,
            peerId: peer.id,
            producerId,
          });

          accept({ success: true });
          break;
        }

        default:
          logger.warn(`❌ Unknown request method: ${request.method}`, {
            roomId,
            peerId: peer.id,
          });
          reject(new Error(`Unknown request method: ${request.method}`));
      }
    } catch (error) {
      logger.error('❌ Request handler error:', error);
      reject(
        error instanceof Error ? error : new Error('Internal server error'),
      );
    }
  }
}

export const protooRequestHandler = new ProtooRequestHandler();
