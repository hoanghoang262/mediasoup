import { createServer } from 'http';

import app from '@/app';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { mediasoupService } from '@/services/mediasoup/MediasoupService';
import { protooService } from '@/services/protoo/ProtooService';

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

async function startServer(): Promise<void> {
  try {
    const server = createServer((req, res) => {
      void app(req, res);
    });

    // Initialize MediaSoup
    await mediasoupService.initialize();
    logger.info('MediaSoup initialized successfully');

    // Initialize Protoo service
    protooService.initialize(server);

    server.listen(env.PORT, env.HOST);

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      // Handle specific listen errors with friendly messages
      switch (error.code) {
        case 'EACCES':
          logger.error(`Port ${env.PORT} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`Port ${env.PORT} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

    server.on('listening', () => {
      const addr = server.address();
      const bind =
        typeof addr === 'string' ? `pipe ${addr}` : `${env.HOST}:${env.PORT}`;
      logger.info(
        `🚀 Server listening on http://${bind} in ${env.NODE_ENV} mode`,
      );
    });

    // Handle graceful shutdown
    const cleanup = async () => {
      logger.info('Shutting down server...');

      try {
        // Close HTTP server first to stop accepting new connections
        await new Promise<void>(
          (resolve) => void server.close(() => resolve()),
        );
        logger.info('HTTP server closed');

        // Close MediaSoup
        await mediasoupService.close();
        logger.info('MediaSoup closed');

        process.exit(0);
      } catch (error) {
        logger.error('Error during cleanup:', error);
        process.exit(1);
      }
    };

    // Handle termination signals
    process.on('SIGTERM', () => void cleanup());
    process.on('SIGINT', () => void cleanup());
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
void startServer();
