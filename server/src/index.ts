import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { createApp } from './app';
import { connectDB, disconnectDB } from './config/db';
import { sweepExpiredRequests } from './controllers/requestController';
import { initSocket } from './services/socketService';
import { User } from './models/User';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    // Initial sweep of expired requests
    await sweepExpiredRequests();

    // Schedule periodic sweep every 5 minutes
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

    server.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` PlayNear API & Real-Time Server running on port ${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(` WebSockets:  Socket.IO active on ws://localhost:${PORT}`);
      console.log(` API Docs:    http://localhost:${PORT}/api/docs`);
      console.log(` Health:      http://localhost:${PORT}/api/health`);
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
  } catch (error: any) {
    console.error('[Server Start Error]:', error);
    process.exit(1);
  }
};

startServer();
