import 'dotenv/config';
import app from './src/app.js';

let PORT = parseInt(process.env.PORT, 10) || 5001;

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(
      `[SmartConnect Server] running on http://localhost:${port} in ${process.env.NODE_ENV || 'development'} mode`
    );
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[SmartConnect Server] Port ${port} is in use (often macOS AirPlay on 5000). Retrying on port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('[SmartConnect Server] Fatal error:', err);
      process.exit(1);
    }
  });

  const gracefulShutdown = (signal) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return server;
}

const server = startServer(PORT);

export default server;
