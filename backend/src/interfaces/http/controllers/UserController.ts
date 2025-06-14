import { Request, Response } from 'express';

import { GetAllUsersUseCase } from '../../../application/usecases/user/GetAllUsersUseCase';
import { GetUserByIdUseCase } from '../../../application/usecases/user/GetUserByIdUseCase';
import { Logger } from '../../../shared/config/logger';

const log = new Logger('user-controller');

export class UserController {
  constructor(
    private readonly _getAllUsersUseCase: GetAllUsersUseCase,
    private readonly _getUserByIdUseCase: GetUserByIdUseCase,
  ) {}

  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      log.info('Getting all users', 'getAllUsers');
      const users = await this._getAllUsersUseCase.execute();
      res.json(users);
    } catch (error) {
      log.error(
        'Failed to get all users',
        error instanceof Error ? error : new Error(String(error)),
        'getAllUsers',
      );
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      log.info(`Getting user by ID: ${id}`, 'getUserById', { userId: id });
      const user = await this._getUserByIdUseCase.execute(id);

      if (!user) {
        log.warn(`User not found: ${id}`, 'getUserById', { userId: id });
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(user);
    } catch (error) {
      log.error(
        'Failed to get user by ID',
        error instanceof Error ? error : new Error(String(error)),
        'getUserById',
      );
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
