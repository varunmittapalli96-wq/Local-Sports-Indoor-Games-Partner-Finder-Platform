/// <reference types="jest" />
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db';

beforeAll(async () => {
  // Ensure we connect to isolated test database
  await connectDB(process.env.MONGODB_URI || 'mongodb://localhost:27017/playnear_platform_db');
});

afterAll(async () => {
  await disconnectDB();
});
