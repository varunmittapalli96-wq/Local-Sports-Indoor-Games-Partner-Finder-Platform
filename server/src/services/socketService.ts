import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken, TokenPayload } from '../utils/token';
import { ActivityLog } from '../models/ActivityLog';

let io: SocketIOServer | null = null;

// Track online users: userId -> Set of active socket IDs
const onlineUsers = new Map<string, Set<string>>();

export interface RealtimeActivity {
  id?: string;
  action: string;
  title: string;
  description: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, any>;
  timestamp: string;
}

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow all local development origins and configured CLIENT_URL
        callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    },
    pingTimeout: 30000,
    pingInterval: 15000,
  });

  // Authentication Middleware for Sockets
  io.use((socket: Socket, next) => {
    try {
      let token: string | undefined = socket.handshake.auth?.token;

      // Also check headers.cookie if token wasn't provided directly in auth payload
      if (!token && socket.handshake.headers.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';').reduce((acc, pair) => {
          const [key, val] = pair.trim().split('=');
          if (key && val) acc[key] = decodeURIComponent(val);
          return acc;
        }, {} as Record<string, string>);
        token = cookies['token'];
      }

      if (token) {
        try {
          const decoded = verifyToken(token);
          socket.data.user = decoded;
        } catch (tokenErr) {
          // Token expired or invalid, still allow guest connection to public channels
          socket.data.user = null;
        }
      } else {
        socket.data.user = null;
      }

      next();
    } catch (err: any) {
      next(); // Continue as anonymous guest
    }
  });

  io.on('connection', (socket: Socket) => {
    // Every connected client joins the public platform room
    socket.join('platform:public');

    const user: TokenPayload | null = socket.data.user;

    if (user && user.userId) {
      const uid = user.userId.toString();
      socket.join(`user:${uid}`);

      // Track online status
      if (!onlineUsers.has(uid)) {
        onlineUsers.set(uid, new Set());
      }
      onlineUsers.get(uid)!.add(socket.id);

      // Join admin room if user role is admin
      if (user.role === 'admin') {
        socket.join('admin');
      }

      // Notify public presence
      broadcastOnlinePresence();
    } else {
      // Send current count to guest
      socket.emit('presence:online_count', {
        onlineCount: onlineUsers.size,
        activeSockets: io ? io.engine.clientsCount : 1,
      });
    }

    // Ping / Pong heartbeat for latency measurement
    socket.on('ping:client', (callback) => {
      if (typeof callback === 'function') callback({ timestamp: Date.now() });
    });

    socket.on('disconnect', () => {
      if (user && user.userId) {
        const uid = user.userId.toString();
        const userSockets = onlineUsers.get(uid);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            onlineUsers.delete(uid);
          }
        }
        broadcastOnlinePresence();
      }
    });
  });

  console.log('[Socket.IO] Real-Time WebSocket Server initialized successfully');
  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO is not initialized yet. Call initSocket(server) first.');
  }
  return io;
};

export const broadcastOnlinePresence = () => {
  if (!io) return;
  const onlineCount = onlineUsers.size;
  const activeSockets = io.engine.clientsCount;
  io.to('platform:public').emit('presence:online_count', {
    onlineCount,
    activeSockets,
    timestamp: new Date().toISOString(),
  });
};

export const isUserOnline = (userId: string): boolean => {
  return onlineUsers.has(userId.toString()) && (onlineUsers.get(userId.toString())?.size || 0) > 0;
};

export const getOnlineUserIds = (): string[] => {
  return Array.from(onlineUsers.keys());
};

export const emitToUser = (userId: string, event: string, data: any) => {
  if (!io) return;
  io.to(`user:${userId.toString()}`).emit(event, data);
};

export const emitToAdmin = (event: string, data: any) => {
  if (!io) return;
  io.to('admin').emit(event, data);
};

export const emitToAll = (event: string, data: any) => {
  if (!io) return;
  io.to('platform:public').emit(event, data);
};

export const broadcastNotification = (userId: string, notification: any) => {
  if (!io) return;
  io.to(`user:${userId.toString()}`).emit('notification:new', notification);
};

export const broadcastRequestUpdate = (
  request: any,
  eventType: 'created' | 'accepted' | 'declined' | 'cancelled' | 'completed' | 'expired',
  targetUserIds: string[]
) => {
  if (!io) return;
  const payload = {
    type: eventType,
    request,
    timestamp: new Date().toISOString(),
  };

  for (const uid of targetUserIds) {
    if (uid) {
      io.to(`user:${uid.toString()}`).emit('request:update', payload);
      io.to(`user:${uid.toString()}`).emit(`request:${eventType}`, payload);
    }
  }

  // Also broadcast to admin room for real-time tracking
  io.to('admin').emit('admin:request_event', payload);
};

export const broadcastActivity = async (activity: {
  action: string;
  title: string;
  description: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, any>;
  actorId?: string;
  actorEmail?: string;
}) => {
  if (!io) return;

  const activityPayload: RealtimeActivity = {
    action: activity.action,
    title: activity.title,
    description: activity.description,
    entity: activity.entity || 'General',
    entityId: activity.entityId,
    meta: activity.meta,
    timestamp: new Date().toISOString(),
  };

  // Broadcast to public and admin streams
  io.to('platform:public').emit('activity:new', activityPayload);
  io.to('admin').emit('admin:activity_new', activityPayload);

  // Persist to ActivityLog in DB for audit trail
  try {
    await ActivityLog.create({
      actor: activity.actorId,
      actorEmail: activity.actorEmail,
      action: activity.action,
      entity: activity.entity || 'General',
      entityId: activity.entityId,
      meta: activity.meta,
    });
  } catch (err: any) {
    // Non-fatal logging error
    console.error('[Socket ActivityLog Error]:', err.message);
  }
};
