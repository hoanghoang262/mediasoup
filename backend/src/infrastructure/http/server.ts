import { join } from 'path';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, {
  type NextFunction,
  type Request,
  type Response,
  json,
  urlencoded,
  static as expressStatic,
} from 'express';
import { Router } from 'express';
import createError, { HttpError } from 'http-errors';
import morgan from 'morgan';

import { env, logger } from '../../shared/config';

export const createServer = (apiRouter: Router): express.Application => {
  const app = express();

  // view engine setup
  const __dirname = new URL('.', import.meta.url).pathname;
  app.set('views', join(__dirname, '../../interfaces/http/views'));
  app.set('view engine', 'pug');

  // Set up CORS
  const parseOrigins = (originsStr: string): (string | RegExp)[] => {
    return originsStr.split(',').map((origin) => origin.trim());
  };

  const corsOptions = {
    origin: parseOrigins(env.CORS_ALLOWED_ORIGINS),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    maxAge: 86400, // 24 hours
  };

  // Apply CORS middleware to all routes
  app.use(cors(corsOptions));

  // Add CORS preflight support for all routes
  app.options('/*splat', cors(corsOptions));

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
  app.use(expressStatic(join(process.cwd(), 'public')));

  // Mount the API router
  app.use('/api', apiRouter);

  // catch 404 and forward to error handler
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(createError(404));
  });

  // error handler - deliberately ignore the next parameter as it's required by Express but not used
  app.use(function errorHandler(err: HttpError, req: Request, res: Response) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
  });

  return app;
};
