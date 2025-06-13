import { Router } from 'express';

import { createRoomRouter } from './RoomRoutes';
import { createUserRouter } from './UserRoutes';
import { RoomController } from '../controllers/RoomController';
import { UserController } from '../controllers/UserController';

export const createApiRouter = (
  userController: UserController,
  roomController: RoomController,
): Router => {
  const router = Router();

  // Health check route
  router.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'mediasoup-server',
    });
  });

  // API routes
  router.use('/users', createUserRouter(userController));
  router.use('/rooms', createRoomRouter(roomController));

  return router;
};
