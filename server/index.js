import env from './src/config/env.js';
import app from './src/app.js';
import { logger } from './src/utils/logger.js';
import { startScheduler, stopScheduler } from './src/jobs/scheduler.js';

let PORT = env.PORT;

function startServer(port) {
  const server = app.listen(port, () => {
    logger.info(
      `[SmartConnect Server] running on http://localhost:${port} in ${env.NODE_ENV} mode`
    );
    startScheduler();
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(
        `[SmartConnect Server] Port ${port} is in use (e.g. macOS AirPlay). Retrying on port ${port + 1}...`
      );
      startServer(port + 1);
    } else {
      logger.error({ err }, '[SmartConnect Server] Fatal server startup error');
      process.exit(1);
    }
  });

  const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    stopScheduler();
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return server;
}

const server = startServer(PORT);

export default server;
