/**
 * Module dependencies.
 */
import http from 'http';

import app from '../app';
import { container } from '../container';
import { env } from '../shared/config';
import { Logger } from '../shared/config/logger';

const log = new Logger('server');

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
      log.error(`${bind} requires elevated privileges`, undefined, 'onError');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      log.error(`${bind} is already in use`, undefined, 'onError');
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
  log.info(`Server listening on ${bind}`, 'onListening');
}

/**
 * Handle graceful shutdown
 */
function handleGracefulShutdown(): void {
  log.info('Shutting down server...', 'handleGracefulShutdown');

  server.close(() => {
    log.info('Server shutdown complete', 'handleGracefulShutdown');
    // Close mediasoup using void to handle the Promise
    void container.mediasoupService
      .close()
      .then(() => {
        log.info('MediaSoup closed', 'handleGracefulShutdown');
        process.exit(0);
      })
      .catch((error) => {
        log.error('Error closing MediaSoup:', error, 'handleGracefulShutdown');
        process.exit(1);
      });
  });

  // Force shutdown after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    log.error(
      'Forced shutdown after timeout',
      undefined,
      'handleGracefulShutdown',
    );
    process.exit(1);
  }, 10000);
}

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error: Error) => {
  log.error('Uncaught exception:', error, 'uncaughtException');
  handleGracefulShutdown();
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason: unknown) => {
  log.error(
    'Unhandled rejection:',
    new Error(String(reason)),
    'unhandledRejection',
  );
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
    log.info('MediaSoup initialized successfully', 'startServer');

    // Initialize protoo WebSocket server
    container.protooService.initialize(server);
    log.info('Protoo server initialized', 'startServer');

    // Listen on provided port, on all network interfaces.
    server.listen(port);
    server.on('error', onError);
    server.on('listening', onListening);
  } catch (error) {
    log.error(
      'Failed to initialize services:',
      error instanceof Error ? error : new Error(String(error)),
      'startServer',
    );
    process.exit(1);
  }
}

// Start server
void startServer().catch((error) => {
  log.error(
    'Startup error:',
    error instanceof Error ? error : new Error(String(error)),
    'startServer',
  );
  process.exit(1);
});
