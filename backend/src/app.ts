import { container } from './container';
import { createServer } from './infrastructure/http/server';
import { createApiRouter } from './interfaces/http/routes';
import { env } from './shared/config';
import { Logger } from './shared/config/logger';

const log = new Logger('app');

// Validate environment variables before starting the app
log.info(`Starting server in ${env.NODE_ENV} mode...`, 'startup');

// Create the API router
const apiRouter = createApiRouter(
  container.userController,
  container.roomController,
);

// Create the Express server
const app = createServer(apiRouter);

export default app;
