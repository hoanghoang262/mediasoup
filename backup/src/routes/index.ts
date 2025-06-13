import { Router, type Request, type Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response): void => {
  res.render('index', { title: 'Express' });
});

export default router;
