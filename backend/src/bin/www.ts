/**
 * Module dependencies.
 */
import http from 'http';

import app from '../app';
import { container } from '../infrastructure/container';
import { env, logger } from '../shared/config';

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val: string): number | string | boolean {
  const port = parseInt(val, 10);

  if (Number.isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(env.PORT.toString());
app.set('port', port);

/**
 * Create HTTP server.
 */
// eslint-disable-next-line @typescript-eslint/no-misused-promises
const server = http.createServer(app);

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error: NodeJS.ErrnoException): void {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening(): void {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port}`;
  logger.info(`Server listening on ${bind}`);
}

/**
 * Handle graceful shutdown
 */
function handleGracefulShutdown(): void {
  logger.info('Shutting down server...');

  server.close(() => {
    logger.info('Server shutdown complete');
    // Close mediasoup using void to handle the Promise
    void container.mediasoupService
      .close()
      .then(() => {
        logger.info('MediaSoup closed');
        process.exit(0);
      })
      .catch((error) => {
        logger.error('Error closing MediaSoup:', error);
        process.exit(1);
      });
  });

  // Force shutdown after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  handleGracefulShutdown();
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection:', reason);
});

/**
 * Handle SIGTERM and SIGINT signals
 */
process.on('SIGTERM', handleGracefulShutdown);
process.on('SIGINT', handleGracefulShutdown);

/**
 * Initialize services and start listening
 */
async function startServer(): Promise<void> {
  try {
    // Initialize mediasoup
    await container.mediasoupService.initialize();
    logger.info('MediaSoup initialized successfully');

    // Initialize protoo WebSocket server
    container.protooService.initialize(server);
    logger.info('Protoo server initialized');

    // Listen on provided port, on all network interfaces.
    server.listen(port);
    server.on('error', onError);
    server.on('listening', onListening);
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Start server
void startServer().catch((error) => {
  logger.error('Startup error:', error);
  process.exit(1);
});
