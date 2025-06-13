import { Router } from 'express';

import { UserController } from '../controllers/UserController';

export const createUserRouter = (userController: UserController): Router => {
  const router = Router();

  router.get('/', (req, res) => userController.getAllUsers(req, res));
  router.get('/:id', (req, res) => userController.getUserById(req, res));

  return router;
};
