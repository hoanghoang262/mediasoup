import { Request, Response } from 'express';

import { CreateRoomUseCase } from '../../../application/usecases/room/CreateRoomUseCase';
import { GetAllRoomsUseCase } from '../../../application/usecases/room/GetAllRoomsUseCase';
import { GetOrCreateRoomUseCase } from '../../../application/usecases/room/GetOrCreateRoomUseCase';
import { GetRoomByIdUseCase } from '../../../application/usecases/room/GetRoomByIdUseCase';

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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: unknown) {
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: unknown) {
      res.status(500).json({ error: 'Failed to get room' });
    }
  }

  async createRoom(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.body;

      if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'Room ID is required' });
        return;
      }

      const room = await this._createRoomUseCase.execute(id);
      res.status(201).json(room);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: unknown) {
      res.status(500).json({ error: 'Failed to create room' });
    }
  }

  async getOrCreateRoom(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const room = await this._getOrCreateRoomUseCase.execute(id);
      res.status(200).json(room);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: unknown) {
      res.status(500).json({ error: 'Failed to get or create room' });
    }
  }
}
