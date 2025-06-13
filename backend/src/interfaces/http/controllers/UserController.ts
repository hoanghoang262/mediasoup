import { Request, Response } from 'express';

import { GetAllUsersUseCase } from '../../../application/usecases/user/GetAllUsersUseCase';
import { GetUserByIdUseCase } from '../../../application/usecases/user/GetUserByIdUseCase';

export class UserController {
  constructor(
    private readonly _getAllUsersUseCase: GetAllUsersUseCase,
    private readonly _getUserByIdUseCase: GetUserByIdUseCase,
  ) {}

  async getAllUsers(_req: Request, res: Response): Promise<void> {
    try {
      const users = await this._getAllUsersUseCase.execute();
      res.status(200).json(users);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: unknown) {
      res.status(500).json({ error: 'Failed to get users' });
    }
  }

  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this._getUserByIdUseCase.execute(id);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json(user);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: unknown) {
      res.status(500).json({ error: 'Failed to get user' });
    }
  }
}
