import express from 'express';
import request from 'supertest';

import { RoomDto } from '../../../src/application/dtos/RoomDto';
import { CreateRoomUseCase } from '../../../src/application/usecases/room/CreateRoomUseCase';
import { GetAllRoomsUseCase } from '../../../src/application/usecases/room/GetAllRoomsUseCase';
import { GetOrCreateRoomUseCase } from '../../../src/application/usecases/room/GetOrCreateRoomUseCase';
import { GetRoomByIdUseCase } from '../../../src/application/usecases/room/GetRoomByIdUseCase';
import { RoomController } from '../../../src/interfaces/http/controllers/RoomController';
import { createRoomRouter } from '../../../src/interfaces/http/routes/RoomRoutes';

// Mock the use cases
jest.mock('../../../src/application/usecases/room/CreateRoomUseCase');
jest.mock('../../../src/application/usecases/room/GetAllRoomsUseCase');
jest.mock('../../../src/application/usecases/room/GetRoomByIdUseCase');
jest.mock('../../../src/application/usecases/room/GetOrCreateRoomUseCase');

// Mock generateRoomId
jest.mock('../../../src/shared/utils/generateRoomId', () => ({
  generateRoomId: jest.fn().mockResolvedValue('abc-defg-hijk'),
}));

describe('Room HTTP Controller', () => {
  let app: express.Application;
  let roomController: RoomController;

  // Mock use case instances
  let mockCreateRoomUseCase: jest.Mocked<CreateRoomUseCase>;
  let mockGetAllRoomsUseCase: jest.Mocked<GetAllRoomsUseCase>;
  let mockGetRoomByIdUseCase: jest.Mocked<GetRoomByIdUseCase>;
  let mockGetOrCreateRoomUseCase: jest.Mocked<GetOrCreateRoomUseCase>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock use case instances
    mockCreateRoomUseCase = {
      execute: jest.fn(),
      roomRepository: {
        findById: jest.fn(),
        save: jest.fn(),
        findAll: jest.fn(),
        delete: jest.fn(),
      },
    } as unknown as jest.Mocked<CreateRoomUseCase>;

    mockGetAllRoomsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetAllRoomsUseCase>;

    mockGetRoomByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetRoomByIdUseCase>;

    mockGetOrCreateRoomUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetOrCreateRoomUseCase>;

    // Create controller with mocked use cases
    roomController = new RoomController(
      mockGetAllRoomsUseCase,
      mockGetRoomByIdUseCase,
      mockCreateRoomUseCase,
      mockGetOrCreateRoomUseCase,
    );

    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/rooms', createRoomRouter(roomController));
  });

  describe('GET /api/rooms', () => {
    it('should return all rooms successfully', async () => {
      const mockRooms: RoomDto[] = [
        {
          id: 'room1',
          createdAt: '2023-01-01T00:00:00.000Z',
          participants: ['user1', 'user2'],
          participantCount: 2,
        },
        {
          id: 'room2',
          createdAt: '2023-01-02T00:00:00.000Z',
          participants: [],
          participantCount: 0,
        },
      ];

      mockGetAllRoomsUseCase.execute.mockResolvedValue(mockRooms);

      const response = await request(app).get('/api/rooms').expect(200);

      expect(response.body).toEqual(mockRooms);
      expect(mockGetAllRoomsUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle internal server error', async () => {
      mockGetAllRoomsUseCase.execute.mockRejectedValue(
        new Error('Database error'),
      );

      await request(app).get('/api/rooms').expect(500);
    });
  });

  describe('GET /api/rooms/:id', () => {
    it('should return room by id successfully', async () => {
      const mockRoom: RoomDto = {
        id: 'test-room',
        createdAt: '2023-01-01T00:00:00.000Z',
        participants: ['user1'],
        participantCount: 1,
      };

      mockGetRoomByIdUseCase.execute.mockResolvedValue(mockRoom);

      const response = await request(app)
        .get('/api/rooms/test-room')
        .expect(200);

      expect(response.body).toEqual(mockRoom);
      expect(mockGetRoomByIdUseCase.execute).toHaveBeenCalledWith('test-room');
    });

    it('should return 404 when room not found', async () => {
      mockGetRoomByIdUseCase.execute.mockResolvedValue(null);

      await request(app).get('/api/rooms/non-existent').expect(404);
    });

    it('should handle internal server error', async () => {
      mockGetRoomByIdUseCase.execute.mockRejectedValue(
        new Error('Database error'),
      );

      const response = await request(app)
        .get('/api/rooms/test-room')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to get room' });
    });
  });

  describe('POST /api/rooms', () => {
    it('should create a new room successfully', async () => {
      const mockRoom: RoomDto = {
        id: 'abc-defg-hijk',
        createdAt: '2023-01-01T00:00:00.000Z',
        participants: [],
        participantCount: 0,
      };

      mockCreateRoomUseCase.execute.mockResolvedValue(mockRoom);

      const response = await request(app).post('/api/rooms').expect(201);

      expect(response.body).toEqual({
        roomId: 'abc-defg-hijk',
        room: mockRoom,
      });
      expect(mockCreateRoomUseCase.execute).toHaveBeenCalledWith(
        'abc-defg-hijk',
      );
    });

    it('should handle internal server error during creation', async () => {
      mockCreateRoomUseCase.execute.mockRejectedValue(
        new Error('Creation failed'),
      );

      const response = await request(app).post('/api/rooms').expect(500);

      expect(response.body).toEqual({ error: 'Failed to create room' });
    });
  });

  describe('POST /api/rooms/:id/join', () => {
    it('should join existing room successfully', async () => {
      const mockRoom: RoomDto = {
        id: 'existing-room',
        createdAt: '2023-01-01T00:00:00.000Z',
        participants: ['user1'],
        participantCount: 1,
      };

      mockGetRoomByIdUseCase.execute.mockResolvedValue(mockRoom);

      const response = await request(app)
        .post('/api/rooms/existing-room/join')
        .expect(200);

      expect(response.body).toEqual(mockRoom);
      expect(mockGetRoomByIdUseCase.execute).toHaveBeenCalledWith(
        'existing-room',
      );
    });

    it('should return 404 when trying to join non-existent room', async () => {
      mockGetRoomByIdUseCase.execute.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/rooms/non-existent/join')
        .expect(404);

      expect(response.body).toEqual({ error: 'Room does not exist' });
    });

    it('should handle internal server error during join', async () => {
      mockGetRoomByIdUseCase.execute.mockRejectedValue(
        new Error('Join failed'),
      );

      const response = await request(app)
        .post('/api/rooms/test-room/join')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to join room' });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/rooms')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      // Express will handle malformed JSON with 400 status
    });

    it('should handle missing route parameters gracefully', async () => {
      // Test with empty room ID
      const response = await request(app).get('/api/rooms/').expect(200); // This should hit the GET all rooms endpoint

      expect(mockGetAllRoomsUseCase.execute).toHaveBeenCalled();
    });
  });

  describe('Response Format Validation', () => {
    it('should return consistent room DTO format', async () => {
      const mockRoom: RoomDto = {
        id: 'test-room',
        createdAt: '2023-01-01T00:00:00.000Z',
        participants: ['user1', 'user2'],
        participantCount: 2,
        routerId: 'router-123',
      };

      mockGetRoomByIdUseCase.execute.mockResolvedValue(mockRoom);

      const response = await request(app)
        .get('/api/rooms/test-room')
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('participants');
      expect(response.body).toHaveProperty('participantCount');
      expect(Array.isArray(response.body.participants)).toBe(true);
      expect(typeof response.body.participantCount).toBe('number');
    });

    it('should return array for get all rooms', async () => {
      const mockRooms: RoomDto[] = [];
      mockGetAllRoomsUseCase.execute.mockResolvedValue(mockRooms);

      const response = await request(app).get('/api/rooms').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Integration with Use Cases', () => {
    it('should properly inject dependencies', () => {
      expect(roomController).toBeDefined();
      expect(roomController).toBeInstanceOf(RoomController);
    });

    it('should call use cases with correct parameters', async () => {
      const roomId = 'test-specific-id';
      mockGetRoomByIdUseCase.execute.mockResolvedValue(null);

      await request(app).get(`/api/rooms/${roomId}`).expect(404);

      expect(mockGetRoomByIdUseCase.execute).toHaveBeenCalledWith(roomId);
      expect(mockGetRoomByIdUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });
});
