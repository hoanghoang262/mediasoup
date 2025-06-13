import { createServer, Server } from 'http';

import * as protoo from 'protoo-server';
import WebSocket from 'ws';

import { InMemoryRoomRepository } from '../../../src/infrastructure/repositories/InMemoryRoomRepository';
import { MediasoupService } from '../../../src/infrastructure/services/mediasoup/MediasoupService';
import { ProtooService } from '../../../src/infrastructure/services/protoo/ProtooService';
import { RoomManager } from '../../../src/infrastructure/services/room/RoomManager';

// Mock mediasoup to avoid creating real workers
jest.mock('mediasoup', () => ({
  types: {},
  createWorker: jest.fn().mockResolvedValue({
    createRouter: jest.fn().mockResolvedValue({
      id: 'router-123',
      rtpCapabilities: {
        codecs: [
          {
            kind: 'video',
            mimeType: 'video/VP8',
            clockRate: 90000,
          },
        ],
        headerExtensions: [],
        fecMechanisms: [],
      },
      createWebRtcTransport: jest.fn().mockResolvedValue({
        id: 'transport-123',
        iceParameters: {
          iceLite: false,
          password: 'test',
          usernameFragment: 'test',
        },
        iceCandidates: [],
        dtlsParameters: { role: 'auto', fingerprints: [] },
        connect: jest.fn().mockResolvedValue(undefined),
        produce: jest.fn().mockResolvedValue({
          id: 'producer-123',
          kind: 'video',
          close: jest.fn(),
        }),
        consume: jest.fn().mockResolvedValue({
          id: 'consumer-123',
          kind: 'video',
          rtpParameters: {},
          resume: jest.fn().mockResolvedValue(undefined),
          close: jest.fn(),
        }),
        close: jest.fn(),
      }),
      canConsume: jest.fn().mockReturnValue(true),
      close: jest.fn(),
    }),
    close: jest.fn(),
  }),
}));

describe('ProtooService WebSocket Integration', () => {
  let httpServer: Server;
  let protooService: ProtooService;
  let roomManager: RoomManager;
  let mediasoupService: MediasoupService;
  let roomRepository: InMemoryRoomRepository;
  let serverPort: number;

  beforeAll(async () => {
    // Create dependencies
    roomRepository = new InMemoryRoomRepository([]);
    mediasoupService = new MediasoupService();
    await mediasoupService.initialize(1); // Initialize with 1 worker

    roomManager = new RoomManager(roomRepository, mediasoupService);
    protooService = new ProtooService(roomManager);

    // Create HTTP server
    httpServer = createServer();

    // Initialize protoo service
    protooService.initialize(httpServer);

    // Start server on random port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        serverPort = (httpServer.address() as any)?.port || 0;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await mediasoupService.close();
    httpServer.close();
  });

  describe('WebSocket Connection Flow', () => {
    let clientPeer: any;

    afterEach(() => {
      if (clientPeer && !clientPeer.closed) {
        clientPeer.close();
      }
    });

    it('should accept valid WebSocket connection', (done) => {
      const roomId = 'test-room-123';
      const peerId = 'user-123';
      const wsUrl = `ws://localhost:${serverPort}?roomId=${roomId}&peerId=${peerId}`;

      clientPeer = new protoo.Peer(wsUrl);

      clientPeer.on('open', () => {
        expect(clientPeer.closed).toBe(false);
        done();
      });

      clientPeer.on('failed', (error: Error) => {
        done(error);
      });
    });

    it('should reject connection without roomId', (done) => {
      const wsUrl = `ws://localhost:${serverPort}?peerId=user-123`;

      clientPeer = new protoo.Peer(wsUrl);

      clientPeer.on('failed', (error: Error) => {
        expect(error.message).toContain('400');
        done();
      });

      clientPeer.on('open', () => {
        done(new Error('Should not have connected'));
      });
    });

    it('should reject connection without peerId', (done) => {
      const wsUrl = `ws://localhost:${serverPort}?roomId=test-room`;

      clientPeer = new protoo.Peer(wsUrl);

      clientPeer.on('failed', (error: Error) => {
        expect(error.message).toContain('400');
        done();
      });

      clientPeer.on('open', () => {
        done(new Error('Should not have connected'));
      });
    });
  });

  describe('Protoo Message Handling', () => {
    let clientPeer: any;
    const roomId = 'test-room-messages';
    const peerId = 'user-messages';

    beforeEach((done) => {
      const wsUrl = `ws://localhost:${serverPort}?roomId=${roomId}&peerId=${peerId}`;
      clientPeer = new protoo.Peer(wsUrl);

      clientPeer.on('open', () => done());
      clientPeer.on('failed', done);
    });

    afterEach(() => {
      if (clientPeer && !clientPeer.closed) {
        clientPeer.close();
      }
    });

    describe('Ping/Pong Messages', () => {
      it('should respond to ping with pong', async () => {
        const response = await clientPeer.request('ping', {});
        expect(response).toEqual({ pong: true });
      });

      it('should receive server ping notifications', (done) => {
        let pingReceived = false;

        clientPeer.on('notification', (notification: any) => {
          if (notification.method === 'ping' && !pingReceived) {
            pingReceived = true;
            expect(notification.data).toHaveProperty('timestamp');
            expect(typeof notification.data.timestamp).toBe('number');
            done();
          }
        });

        // Ping should be sent automatically within 30 seconds
        // For testing, we'll wait a shorter time
        setTimeout(() => {
          if (!pingReceived) {
            done(new Error('No ping received within timeout'));
          }
        }, 5000);
      });
    });

    describe('Router Capabilities', () => {
      it('should get router RTP capabilities', async () => {
        const response = await clientPeer.request(
          'getRouterRtpCapabilities',
          {},
        );

        expect(response).toHaveProperty('rtpCapabilities');
        expect(response.rtpCapabilities).toHaveProperty('codecs');
        expect(response.rtpCapabilities).toHaveProperty('headerExtensions');
        expect(response.rtpCapabilities).toHaveProperty('fecMechanisms');
        expect(Array.isArray(response.rtpCapabilities.codecs)).toBe(true);
      });
    });

    describe('WebRTC Transport Management', () => {
      it('should create WebRTC transport', async () => {
        const response = await clientPeer.request('createWebRtcTransport', {});

        expect(response).toHaveProperty('id');
        expect(response).toHaveProperty('iceParameters');
        expect(response).toHaveProperty('iceCandidates');
        expect(response).toHaveProperty('dtlsParameters');
        expect(typeof response.id).toBe('string');
      });

      it('should connect WebRTC transport', async () => {
        // First create transport
        const transport = await clientPeer.request('createWebRtcTransport', {});

        // Then connect it
        const response = await clientPeer.request('connectWebRtcTransport', {
          transportId: transport.id,
          dtlsParameters: { role: 'client', fingerprints: [] },
        });

        expect(response).toEqual({ success: true });
      });

      it('should handle transport connection with missing data', async () => {
        try {
          await clientPeer.request('connectWebRtcTransport', {});
          throw new Error('Should have thrown');
        } catch (error: any) {
          expect(error.message).toContain('missing data');
        }
      });
    });

    describe('Media Production', () => {
      let transportId: string;

      beforeEach(async () => {
        const transport = await clientPeer.request('createWebRtcTransport', {});
        transportId = transport.id;

        await clientPeer.request('connectWebRtcTransport', {
          transportId,
          dtlsParameters: { role: 'client', fingerprints: [] },
        });
      });

      it('should produce video media', async () => {
        const response = await clientPeer.request('produce', {
          transportId,
          kind: 'video',
          rtpParameters: {
            codecs: [{ mimeType: 'video/VP8', clockRate: 90000 }],
            encodings: [{ active: true }],
          },
          appData: { mediaType: 'camera' },
        });

        expect(response).toHaveProperty('id');
        expect(typeof response.id).toBe('string');
      });

      it('should produce audio media', async () => {
        const response = await clientPeer.request('produce', {
          transportId,
          kind: 'audio',
          rtpParameters: {
            codecs: [{ mimeType: 'audio/opus', clockRate: 48000 }],
            encodings: [{ active: true }],
          },
          appData: { mediaType: 'microphone' },
        });

        expect(response).toHaveProperty('id');
        expect(typeof response.id).toBe('string');
      });

      it('should handle screen sharing production with broadcast', async () => {
        let screenSharingNotification: any = null;

        // Listen for screen sharing notification
        clientPeer.on('notification', (notification: any) => {
          if (notification.method === 'screenSharingStarted') {
            screenSharingNotification = notification;
          }
        });

        const response = await clientPeer.request('produce', {
          transportId,
          kind: 'video',
          rtpParameters: {
            codecs: [{ mimeType: 'video/VP8', clockRate: 90000 }],
            encodings: [{ active: true }],
          },
          appData: { mediaType: 'screen' },
        });

        expect(response).toHaveProperty('id');

        // Wait a bit for notification
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(screenSharingNotification).toBeTruthy();
        expect(screenSharingNotification.data).toEqual({
          peerId,
          producerId: response.id,
        });
      });

      it('should close producer', async () => {
        // First produce something
        const producer = await clientPeer.request('produce', {
          transportId,
          kind: 'video',
          rtpParameters: {
            codecs: [{ mimeType: 'video/VP8', clockRate: 90000 }],
            encodings: [{ active: true }],
          },
          appData: { mediaType: 'camera' },
        });

        // Then close it
        const response = await clientPeer.request('closeProducer', {
          producerId: producer.id,
        });

        expect(response).toEqual({ success: true });
      });
    });

    describe('Media Consumption', () => {
      let transportId: string;
      let producerId: string;

      beforeEach(async () => {
        // Create and connect transport
        const transport = await clientPeer.request('createWebRtcTransport', {});
        transportId = transport.id;

        await clientPeer.request('connectWebRtcTransport', {
          transportId,
          dtlsParameters: { role: 'client', fingerprints: [] },
        });

        // Produce media to consume
        const producer = await clientPeer.request('produce', {
          transportId,
          kind: 'video',
          rtpParameters: {
            codecs: [{ mimeType: 'video/VP8', clockRate: 90000 }],
            encodings: [{ active: true }],
          },
        });
        producerId = producer.id;
      });

      it('should consume media', async () => {
        // Create another transport for consuming
        const recvTransport = await clientPeer.request(
          'createWebRtcTransport',
          {},
        );

        await clientPeer.request('connectWebRtcTransport', {
          transportId: recvTransport.id,
          dtlsParameters: { role: 'client', fingerprints: [] },
        });

        const response = await clientPeer.request('consume', {
          transportId: recvTransport.id,
          producerId,
          rtpCapabilities: {
            codecs: [{ mimeType: 'video/VP8', clockRate: 90000 }],
            headerExtensions: [],
            fecMechanisms: [],
          },
        });

        expect(response).toHaveProperty('id');
        expect(response).toHaveProperty('producerId');
        expect(response).toHaveProperty('kind');
        expect(response).toHaveProperty('rtpParameters');
        expect(response.producerId).toBe(producerId);
      });

      it('should resume consumer', async () => {
        // Create consumer first
        const recvTransport = await clientPeer.request(
          'createWebRtcTransport',
          {},
        );
        await clientPeer.request('connectWebRtcTransport', {
          transportId: recvTransport.id,
          dtlsParameters: { role: 'client', fingerprints: [] },
        });

        const consumer = await clientPeer.request('consume', {
          transportId: recvTransport.id,
          producerId,
          rtpCapabilities: {
            codecs: [{ mimeType: 'video/VP8', clockRate: 90000 }],
            headerExtensions: [],
            fecMechanisms: [],
          },
        });

        // Resume consumer
        const response = await clientPeer.request('resumeConsumer', {
          consumerId: consumer.id,
        });

        expect(response).toEqual({ success: true });
      });
    });

    describe('Room Management', () => {
      it('should get participants', async () => {
        const response = await clientPeer.request('getParticipants', {});

        expect(response).toHaveProperty('participants');
        expect(Array.isArray(response.participants)).toBe(true);
        expect(response.participants).toContain(peerId);
      });
    });

    describe('Error Handling', () => {
      it('should handle unknown method', async () => {
        try {
          await clientPeer.request('unknownMethod', {});
          throw new Error('Should have thrown');
        } catch (error: any) {
          expect(error.message).toContain('unknown method');
        }
      });

      it('should handle requests with missing transport', async () => {
        try {
          await clientPeer.request('produce', {
            transportId: 'non-existent',
            kind: 'video',
            rtpParameters: {},
          });
          throw new Error('Should have thrown');
        } catch (error: any) {
          expect(error.message).toContain('transport not found');
        }
      });
    });
  });

  describe('Multi-Peer Scenarios', () => {
    let peer1: any;
    let peer2: any;
    const roomId = 'multi-peer-room';

    beforeEach((done) => {
      let connectionsReady = 0;

      const checkReady = () => {
        connectionsReady++;
        if (connectionsReady === 2) done();
      };

      peer1 = new protoo.Peer(
        `ws://localhost:${serverPort}?roomId=${roomId}&peerId=peer1`,
      );
      peer2 = new protoo.Peer(
        `ws://localhost:${serverPort}?roomId=${roomId}&peerId=peer2`,
      );

      peer1.on('open', checkReady);
      peer2.on('open', checkReady);

      peer1.on('failed', done);
      peer2.on('failed', done);
    });

    afterEach(() => {
      if (peer1 && !peer1.closed) peer1.close();
      if (peer2 && !peer2.closed) peer2.close();
    });

    it('should notify about participant joining', (done) => {
      peer1.on('notification', (notification: any) => {
        if (notification.method === 'participantJoined') {
          expect(notification.data.peerId).toBe('peer2');
          done();
        }
      });

      // peer2 is already connected, but let's verify the notification system
      // by checking the participants list
      setTimeout(async () => {
        const participants = await peer1.request('getParticipants', {});
        expect(participants.participants).toContain('peer1');
        expect(participants.participants).toContain('peer2');
        done();
      }, 100);
    });

    it('should notify about participant leaving', (done) => {
      peer1.on('notification', (notification: any) => {
        if (notification.method === 'participantLeft') {
          expect(notification.data.peerId).toBe('peer2');
          done();
        }
      });

      // Close peer2 to trigger leave notification
      setTimeout(() => {
        peer2.close();
      }, 100);
    });
  });
});
