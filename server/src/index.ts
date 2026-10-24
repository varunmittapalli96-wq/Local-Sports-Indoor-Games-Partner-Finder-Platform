import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { validateEnv } from './config/env';
import { createApp } from './app';
import { connectDB, disconnectDB } from './config/db';
import { ensureDefaultGames } from './models/Game';
import { sweepExpiredRequests } from './controllers/requestController';
import { initSocket } from './services/socketService';

const startServer = async () => {
  // Validate required environment variables immediately on startup
  const env = validateEnv();

  try {
    // Connect to MongoDB Atlas or local MongoDB
    await connectDB(env.MONGODB_URI);

    // Ensure standard sports and indoor games are available
    await ensureDefaultGames();

    // Initial sweep of expired play requests
    await sweepExpiredRequests();

    // Schedule periodic sweep every 5 minutes (kept running in background)
    const sweepInterval = setInterval(async () => {
      try {
        await sweepExpiredRequests();
      } catch (err: any) {
        console.error('[Sweep Job Error]:', err.message);
      }
    }, 5 * 60 * 1000);

    const app = createApp();
    const server = http.createServer(app);

    // Initialize Socket.IO Real-time Engine
    initSocket(server);

    // Listen on process.env.PORT (fallback 5000), host 0.0.0.0
    server.listen(env.PORT, env.HOST, () => {
      console.log(`====================================================`);
      console.log(` PlayNear API Server active on http://${env.HOST}:${env.PORT}`);
      console.log(` Environment:  ${env.NODE_ENV}`);
      console.log(` Allowed CORS: ${env.CLIENT_ORIGINS.join(', ')}`);
      console.log(` Health Check: http://${env.HOST}:${env.PORT}/health`);
      console.log(` Swagger Docs: http://${env.HOST}:${env.PORT}/api/docs`);
      console.log(`====================================================`);
    });

    const shutdown = async () => {
      console.log('\n[Server] Shutting down gracefully...');
      clearInterval(sweepInterval);
      server.close(async () => {
        await disconnectDB();
        console.log('[Server] Closed remaining connections.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    process.on('unhandledRejection', (reason) => {
      console.error('[Process Unhandled Rejection]:', reason);
    });
    process.on('uncaughtException', (err) => {
      console.error('[Process Uncaught Exception]:', err);
    });
  } catch (error: any) {
    console.error('[Server Start Error]:', error);
    process.exit(1);
  }
};

startServer();
