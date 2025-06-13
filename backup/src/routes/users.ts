import { Router, type Request, type Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response): void => {
  res.send('respond with a resource');
});

export default router;
