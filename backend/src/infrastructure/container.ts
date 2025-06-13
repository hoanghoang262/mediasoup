import { InMemoryRoomRepository } from './repositories/InMemoryRoomRepository';
import { InMemoryUserRepository } from './repositories/InMemoryUserRepository';
import { MediasoupService } from './services/mediasoup/MediasoupService';
import { ProtooService } from './services/protoo/ProtooService';
import { RoomManager } from './services/room/RoomManager';
import { RoomService } from './services/room/RoomService';
import { CreateRoomUseCase } from '../application/usecases/room/CreateRoomUseCase';
import { GetAllRoomsUseCase } from '../application/usecases/room/GetAllRoomsUseCase';
import { GetOrCreateRoomUseCase } from '../application/usecases/room/GetOrCreateRoomUseCase';
import { GetRoomByIdUseCase } from '../application/usecases/room/GetRoomByIdUseCase';
import { JoinRoomUseCase } from '../application/usecases/room/JoinRoomUseCase';
import { LeaveRoomUseCase } from '../application/usecases/room/LeaveRoomUseCase';
import { GetAllUsersUseCase } from '../application/usecases/user/GetAllUsersUseCase';
import { GetUserByIdUseCase } from '../application/usecases/user/GetUserByIdUseCase';
import { Room } from '../domain/entities/Room';
import { User } from '../domain/entities/User';
import { RoomController } from '../interfaces/http/controllers/RoomController';
import { UserController } from '../interfaces/http/controllers/UserController';

// Create some sample users
const sampleUsers = [
  User.create({ username: 'john_doe', email: 'john@example.com' }),
  User.create({ username: 'jane_doe', email: 'jane@example.com' }),
  User.create({ username: 'bob_smith', email: 'bob@example.com' }),
];

// Create some sample rooms
const sampleRooms = [Room.create('main'), Room.create('meeting')];

// Create repositories
const userRepository = new InMemoryUserRepository(sampleUsers);
const roomRepository = new InMemoryRoomRepository(sampleRooms);

// Create services - following clean architecture dependency flow
const mediasoupService = new MediasoupService();
const roomManager = new RoomManager(roomRepository, mediasoupService);
const roomService = new RoomService(roomManager);
const protooService = new ProtooService(roomManager);

// Create user use cases
const getAllUsersUseCase = new GetAllUsersUseCase(userRepository);
const getUserByIdUseCase = new GetUserByIdUseCase(userRepository);

// Create room use cases
const getAllRoomsUseCase = new GetAllRoomsUseCase(roomRepository);
const getRoomByIdUseCase = new GetRoomByIdUseCase(roomRepository);
const createRoomUseCase = new CreateRoomUseCase(roomRepository);
const getOrCreateRoomUseCase = new GetOrCreateRoomUseCase(roomRepository);
const joinRoomUseCase = new JoinRoomUseCase(roomRepository);
const leaveRoomUseCase = new LeaveRoomUseCase(roomRepository);

// Create controllers
const userController = new UserController(
  getAllUsersUseCase,
  getUserByIdUseCase,
);

const roomController = new RoomController(
  getAllRoomsUseCase,
  getRoomByIdUseCase,
  createRoomUseCase,
  getOrCreateRoomUseCase,
);

export const container = {
  // Repositories
  userRepository,
  roomRepository,

  // Services
  mediasoupService,
  roomManager,
  roomService,
  protooService,

  // Use cases
  getAllUsersUseCase,
  getUserByIdUseCase,
  getAllRoomsUseCase,
  getRoomByIdUseCase,
  createRoomUseCase,
  getOrCreateRoomUseCase,
  joinRoomUseCase,
  leaveRoomUseCase,

  // Controllers
  userController,
  roomController,
};
