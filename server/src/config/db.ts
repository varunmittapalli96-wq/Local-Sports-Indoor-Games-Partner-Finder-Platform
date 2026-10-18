import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let mongoMemoryServer: any = null;

export const connectDB = async (customUri?: string): Promise<typeof mongoose> => {
  const uri = customUri || process.env.MONGODB_URI;

  // Try connecting to provided URI if present
  if (uri) {
    try {
      console.log(`[Database] Attempting connection to ${uri.replace(/\/\/.*@/, '//<credentials>@')}...`);
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
        dbName: 'playnear_platform_db',
      });
      console.log(`[Database] Connected successfully to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (err: any) {
      console.warn(`[Database] Could not connect to primary MongoDB URI (${err.message}).`);
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
    }
  }

  // In development or test, fall back gracefully to MongoMemoryServer
  console.log('[Database] Starting in-memory MongoDB server for zero-config local operation...');
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    if (!mongoMemoryServer) {
      mongoMemoryServer = await MongoMemoryServer.create();
    }
    const memUri = mongoMemoryServer.getUri();
    const conn = await mongoose.connect(memUri);
    console.log(`[Database] Connected to In-Memory MongoDB at: ${memUri}`);
    return conn;
  } catch (memErr: any) {
    console.error('[Database] Failed to start MongoMemoryServer:', memErr);
    throw memErr;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
      mongoMemoryServer = null;
    }
    console.log('[Database] Disconnected from MongoDB');
  } catch (err: any) {
    console.error('[Database] Error disconnecting:', err.message);
  }
};
