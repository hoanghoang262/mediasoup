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
import createError, { HttpError } from 'http-errors';
import morgan from 'morgan';

import { env } from '@/config/env';
import { logger } from '@/config/logger';
import indexRouter from '@/routes/index';
import usersRouter from '@/routes/users';

// Validate environment variables before starting the app
logger.info(`Starting server in ${env.NODE_ENV} mode...`);

const app = express();

// view engine setup
const __dirname = new URL('.', import.meta.url).pathname;

app.set('views', join(__dirname, 'views'));
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

// API health check endpoint
app.use('/api/health', (req: Request, res: Response) => {
  // No need for manual CORS headers as we have the cors middleware now
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'mediasoup-server',
  });
});

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use((req: Request, res: Response, next: NextFunction) => {
  next(createError(404));
});

// error handler
app.use((err: HttpError, req: Request, res: Response) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

export default app;
