import { Router } from 'express';

import { RoomController } from '../controllers/RoomController';

export const createRoomRouter = (roomController: RoomController): Router => {
  const router = Router();

  router.get('/', (req, res) => roomController.getAllRooms(req, res));
  router.get('/:id', (req, res) => roomController.getRoomById(req, res));
  router.post('/:id/join', (req, res) => roomController.joinRoom(req, res));
  router.post('/', (req, res) => roomController.createRoom(req, res));

  return router;
};
