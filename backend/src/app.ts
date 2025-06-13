import { env, logger } from './infrastructure/config';
import { container } from './infrastructure/container';
import { createServer } from './infrastructure/http/server';
import { createApiRouter } from './interfaces/http/routes';

// Validate environment variables before starting the app
logger.info(`Starting server in ${env.NODE_ENV} mode...`);

// Create the API router
const apiRouter = createApiRouter(
  container.userController,
  container.roomController,
);

// Create the Express server
const app = createServer(apiRouter);

export default app;
