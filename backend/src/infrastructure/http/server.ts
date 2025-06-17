import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, {
  type NextFunction,
  type Request,
  type Response,
  json,
  urlencoded,
} from 'express';
import { Router } from 'express';
import createError, { HttpError } from 'http-errors';
import morgan from 'morgan';

import { env, logger, getCorsConfig } from '../../shared/config';

export const createServer = (apiRouter: Router): express.Application => {
  const app = express();

  // API-only server - no view engine needed

  // Apply CORS middleware - handles both regular requests and preflight automatically
  app.use(cors(getCorsConfig()));

  // Create a write stream for Morgan
  const morganStream = {
    write: (message: string) => {
      logger.http(message.trim());
    },
  };

  // Use Morgan with Winston
  app.use(
    morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined', {
      stream: morganStream,
    }),
  );

  app.use(json());
  app.use(urlencoded({ extended: false }));
  app.use(cookieParser());

  // Mount the API router
  app.use('/api', apiRouter);

  // catch 404 and forward to error handler
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(createError(404));
  });

  // error handler - deliberately ignore the next parameter as it's required by Express but not used
  app.use(function errorHandler(err: HttpError, req: Request, res: Response) {
    // Return JSON error for API
    res.status(err.status || 500).json({
      error: err.message,
      ...(req.app.get('env') === 'development' && { stack: err.stack }),
    });
  });

  return app;
};
