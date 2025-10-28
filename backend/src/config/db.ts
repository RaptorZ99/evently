import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
import { env } from './env';

export const prisma = new PrismaClient({
  log: env.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

let mongoConnection: Promise<typeof mongoose> | null = null;

export function connectMongo() {
  if (!mongoConnection) {
    mongoConnection = mongoose.connect(env.mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
  }
  return mongoConnection;
}

export async function disconnectMongo() {
  if (mongoConnection) {
    await mongoose.disconnect();
    mongoConnection = null;
  }
}
