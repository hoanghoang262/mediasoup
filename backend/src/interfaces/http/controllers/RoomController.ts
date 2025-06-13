import { Request, Response } from 'express';

import { CreateRoomUseCase } from '../../../application/usecases/room/CreateRoomUseCase';
import { GetAllRoomsUseCase } from '../../../application/usecases/room/GetAllRoomsUseCase';
import { GetOrCreateRoomUseCase } from '../../../application/usecases/room/GetOrCreateRoomUseCase';
import { GetRoomByIdUseCase } from '../../../application/usecases/room/GetRoomByIdUseCase';
import { RoomRepositoryInterface } from '../../../domain/repositories/RoomRepository';
import { generateRoomId } from '../../../shared/utils/generateRoomId';

export class RoomController {
  constructor(
    private readonly _getAllRoomsUseCase: GetAllRoomsUseCase,
    private readonly _getRoomByIdUseCase: GetRoomByIdUseCase,
    private readonly _createRoomUseCase: CreateRoomUseCase,
    private readonly _getOrCreateRoomUseCase: GetOrCreateRoomUseCase,
  ) {}

  async getAllRooms(_req: Request, res: Response): Promise<void> {
    try {
      const rooms = await this._getAllRoomsUseCase.execute();
      res.status(200).json(rooms);
    } catch {
      res.status(500).json({ error: 'Failed to get rooms' });
    }
  }

  async getRoomById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const room = await this._getRoomByIdUseCase.execute(id);

      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      res.status(200).json(room);
    } catch {
      res.status(500).json({ error: 'Failed to get room' });
    }
  }

  /**
   * @swagger
   * /rooms:
   *   post:
   *     summary: Create a new room with a random ID
   *     responses:
   *       201:
   *         description: Room created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 roomId:
   *                   type: string
   *                 room:
   *                   $ref: '#/components/schemas/RoomDto'
   */
  async createRoom(_req: Request, res: Response): Promise<void> {
    try {
      const roomRepository: RoomRepositoryInterface =
        this._createRoomUseCase.roomRepository;
      const id = await generateRoomId(roomRepository);
      const room = await this._createRoomUseCase.execute(id);
      res.status(201).json({ roomId: id, room });
    } catch {
      res.status(500).json({ error: 'Failed to create room' });
    }
  }

  async getOrCreateRoom(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const room = await this._getOrCreateRoomUseCase.execute(id);
      res.status(200).json(room);
    } catch {
      res.status(500).json({ error: 'Failed to get or create room' });
    }
  }

  /**
   * @swagger
   * /rooms/{id}/join:
   *   post:
   *     summary: Join an existing room
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Room ID to join
   *     responses:
   *       200:
   *         description: Room joined successfully
   *       404:
   *         description: Room does not exist
   */
  async joinRoom(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const room = await this._getRoomByIdUseCase.execute(id);
      if (!room) {
        res.status(404).json({ error: 'Room does not exist' });
        return;
      }
      res.status(200).json(room);
    } catch {
      res.status(500).json({ error: 'Failed to join room' });
    }
  }
}
