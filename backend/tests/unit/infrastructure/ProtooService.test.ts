import { ProtooService } from '../../../src/infrastructure/services/protoo/ProtooService';
import { RoomManager } from '../../../src/infrastructure/services/room/RoomManager';

// Mock protoo-server
const mockPeer = {
  closed: false,
  notify: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  close: jest.fn(),
};

const mockProtooRoom = {
  createPeer: jest.fn().mockReturnValue(mockPeer),
};

const mockWebSocketServer = {
  on: jest.fn(),
};

jest.mock('protoo-server', () => ({
  WebSocketServer: jest.fn().mockImplementation(() => mockWebSocketServer),
}));

// Mock RoomManager with proper typing
const mockRoomManager = {
  getOrCreateRoom: jest.fn().mockResolvedValue(undefined),
  getProtooRoom: jest.fn().mockReturnValue(mockProtooRoom),
  setInfrastructureParticipant: jest.fn(),
  addParticipant: jest.fn().mockResolvedValue(undefined),
  removeInfrastructureParticipant: jest.fn(),
  removeParticipant: jest.fn().mockResolvedValue(undefined),
  getRoomParticipants: jest.fn().mockReturnValue(['user1', 'user2']),
  getInfrastructureParticipant: jest.fn(),
  getRouter: jest.fn().mockReturnValue({
    rtpCapabilities: {
      codecs: [{ kind: 'video', mimeType: 'video/VP8', clockRate: 90000 }],
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
        appData: {},
      }),
      consume: jest.fn().mockResolvedValue({
        id: 'consumer-123',
        kind: 'video',
        rtpParameters: {},
        resume: jest.fn().mockResolvedValue(undefined),
      }),
    }),
    canConsume: jest.fn().mockReturnValue(true),
  }),
} as unknown as jest.Mocked<RoomManager>;

// Mock HTTP server
const mockHttpServer = {
  listen: jest.fn(),
  close: jest.fn(),
} as unknown as any;

describe('ProtooService Unit Tests', () => {
  let protooService: ProtooService;

  beforeEach(() => {
    jest.clearAllMocks();
    protooService = new ProtooService(mockRoomManager);
  });

  describe('Initialization', () => {
    it('should initialize WebSocket server', () => {
      protooService.initialize(mockHttpServer);

      expect(mockWebSocketServer.on).toHaveBeenCalledWith(
        'connectionrequest',
        expect.any(Function),
      );
    });
  });

  describe('Connection Handling', () => {
    let connectionHandler: (...args: any[]) => void;
    let mockAccept: jest.Mock;
    let mockReject: jest.Mock;

    beforeEach(() => {
      protooService.initialize(mockHttpServer);
      connectionHandler = mockWebSocketServer.on.mock.calls[0][1];
      mockAccept = jest.fn().mockReturnValue(mockPeer);
      mockReject = jest.fn();
    });

    it('should accept valid connection with roomId and peerId', async () => {
      const mockInfo = {
        request: {
          url: 'ws://localhost:3000?roomId=test-room&peerId=user123',
        },
      };

      await connectionHandler(mockInfo, mockAccept, mockReject);

      expect(mockAccept).toHaveBeenCalled();
      expect(mockReject).not.toHaveBeenCalled();
      expect(mockRoomManager.getOrCreateRoom).toHaveBeenCalledWith('test-room');
      expect(mockRoomManager.addParticipant).toHaveBeenCalledWith(
        'test-room',
        'user123',
      );
    });

    it('should reject connection without roomId', async () => {
      const mockInfo = {
        request: {
          url: 'ws://localhost:3000?peerId=user123',
        },
      };

      await connectionHandler(mockInfo, mockAccept, mockReject);

      expect(mockReject).toHaveBeenCalledWith(
        400,
        'roomId and peerId are required',
      );
      expect(mockAccept).not.toHaveBeenCalled();
    });

    it('should reject connection without peerId', async () => {
      const mockInfo = {
        request: {
          url: 'ws://localhost:3000?roomId=test-room',
        },
      };

      await connectionHandler(mockInfo, mockAccept, mockReject);

      expect(mockReject).toHaveBeenCalledWith(
        400,
        'roomId and peerId are required',
      );
      expect(mockAccept).not.toHaveBeenCalled();
    });

    it('should reject connection without URL', async () => {
      const mockInfo = {
        request: {},
      };

      await connectionHandler(mockInfo, mockAccept, mockReject);

      expect(mockReject).toHaveBeenCalledWith(400, 'url is required');
      expect(mockAccept).not.toHaveBeenCalled();
    });
  });

  describe('Message Handling', () => {
    let requestHandler: (...args: any[]) => void;
    let mockAcceptRequest: jest.Mock;
    let mockRejectRequest: jest.Mock;

    beforeEach(async () => {
      protooService.initialize(mockHttpServer);
      const connectionHandler = mockWebSocketServer.on.mock.calls[0][1];

      const mockInfo = {
        request: {
          url: 'ws://localhost:3000?roomId=test-room&peerId=user123',
        },
      };

      const mockAccept = jest.fn().mockReturnValue(mockPeer);
      const mockReject = jest.fn();

      await connectionHandler(mockInfo, mockAccept, mockReject);

      // Get the request handler that was registered on the peer
      requestHandler = mockPeer.on.mock.calls.find(
        (call: any[]) => call[0] === 'request',
      )[1];
      mockAcceptRequest = jest.fn();
      mockRejectRequest = jest.fn();

      // Setup infrastructure participant mock
      (
        mockRoomManager.getInfrastructureParticipant as jest.Mock
      ).mockReturnValue({
        id: 'user123',
        peer: mockPeer,
        transports: new Map([
          [
            'transport-123',
            {
              id: 'transport-123',
              connect: jest.fn().mockResolvedValue(undefined),
              produce: jest.fn().mockResolvedValue({
                id: 'producer-123',
                kind: 'video',
                close: jest.fn(),
                appData: {},
              }),
              consume: jest.fn().mockResolvedValue({
                id: 'consumer-123',
                kind: 'video',
                rtpParameters: {},
                resume: jest.fn().mockResolvedValue(undefined),
              }),
            },
          ],
        ]),
        producers: new Map([
          [
            'producer-123',
            {
              id: 'producer-123',
              close: jest.fn(),
              appData: {},
            },
          ],
        ]),
        consumers: new Map([
          [
            'consumer-123',
            {
              id: 'consumer-123',
              resume: jest.fn().mockResolvedValue(undefined),
            },
          ],
        ]),
        joinedAt: new Date(),
      });
    });

    it('should handle ping request', async () => {
      const request = { method: 'ping', data: {} };

      await requestHandler(request, mockAcceptRequest, mockRejectRequest);

      expect(mockAcceptRequest).toHaveBeenCalledWith({ pong: true });
      expect(mockRejectRequest).not.toHaveBeenCalled();
    });

    it('should handle getRouterRtpCapabilities request', async () => {
      const request = { method: 'getRouterRtpCapabilities', data: {} };

      await requestHandler(request, mockAcceptRequest, mockRejectRequest);

      expect(mockAcceptRequest).toHaveBeenCalledWith({
        rtpCapabilities: expect.objectContaining({
          codecs: expect.any(Array),
          headerExtensions: expect.any(Array),
          fecMechanisms: expect.any(Array),
        }),
      });
    });

    it('should handle createWebRtcTransport request', async () => {
      const request = { method: 'createWebRtcTransport', data: {} };

      await requestHandler(request, mockAcceptRequest, mockRejectRequest);

      expect(mockAcceptRequest).toHaveBeenCalledWith({
        id: 'transport-123',
        iceParameters: expect.any(Object),
        iceCandidates: expect.any(Array),
        dtlsParameters: expect.any(Object),
      });
    });

    it('should handle connectWebRtcTransport request', async () => {
      const request = {
        method: 'connectWebRtcTransport',
        data: {
          transportId: 'transport-123',
          dtlsParameters: { role: 'client', fingerprints: [] },
        },
      };

      await requestHandler(request, mockAcceptRequest, mockRejectRequest);

      expect(mockAcceptRequest).toHaveBeenCalledWith({ success: true });
    });

    it('should handle produce request', async () => {
      const request = {
        method: 'produce',
        data: {
          transportId: 'transport-123',
          kind: 'video',
          rtpParameters: { codecs: [], encodings: [] },
          appData: { mediaType: 'camera' },
        },
      };

      await requestHandler(request, mockAcceptRequest, mockRejectRequest);

      expect(mockAcceptRequest).toHaveBeenCalledWith({ id: 'producer-123' });
    });

    it('should handle consume request', async () => {
      const request = {
        method: 'consume',
        data: {
          transportId: 'transport-123',
          producerId: 'producer-123',
          rtpCapabilities: {
            codecs: [],
            headerExtensions: [],
            fecMechanisms: [],
          },
        },
      };

      await requestHandler(request, mockAcceptRequest, mockRejectRequest);

      expect(mockAcceptRequest).toHaveBeenCalledWith({
        id: 'consumer-123',
        producerId: 'producer-123',
        kind: 'video',
        rtpParameters: {},
      });
    });

    it('should handle resumeConsumer request', async () => {
      const request = {
        method: 'resumeConsumer',
        data: { consumerId: 'consumer-123' },
      };

      await requestHandler(request, mockAcceptRequest, mockRejectRequest);

      expect(mockAcceptRequest).toHaveBeenCalledWith({ success: true });
    });

    it('should handle getParticipants request', async () => {
      const request = { method: 'getParticipants', data: {} };

      await requestHandler(request, mockAcceptRequest, mockRejectRequest);

      expect(mockAcceptRequest).toHaveBeenCalledWith({
        participants: ['user1', 'user2'],
      });
    });

    it('should handle closeProducer request', async () => {
      const request = {
        method: 'closeProducer',
        data: { producerId: 'producer-123' },
      };

      await requestHandler(request, mockAcceptRequest, mockRejectRequest);

      expect(mockAcceptRequest).toHaveBeenCalledWith({ success: true });
    });

    it('should reject unknown method', async () => {
      const request = { method: 'unknownMethod', data: {} };

      await requestHandler(request, mockAcceptRequest, mockRejectRequest);

      expect(mockRejectRequest).toHaveBeenCalledWith(expect.any(Error));
      expect(mockAcceptRequest).not.toHaveBeenCalled();
    });

    it('should handle missing participant error', async () => {
      (
        mockRoomManager.getInfrastructureParticipant as jest.Mock
      ).mockReturnValue(null);

      const request = { method: 'ping', data: {} };

      await requestHandler(request, mockAcceptRequest, mockRejectRequest);

      expect(mockRejectRequest).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
